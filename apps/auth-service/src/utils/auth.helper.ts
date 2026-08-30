import crypto from 'crypto';
import { ValidationError } from '@packages/error-handler';
import redis from '../../../../packages/lib/redis';
import { sendMail } from './sendMail';
import prisma from '../../../../packages/lib/prisma';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
    data: any,
    userType: 'user' | 'seller',
) => {
    const { name, email, password, phoneNumber, country } = data;

    if (
        !name ||
        !email ||
        !password ||
        (userType === 'seller' && (!phoneNumber || !country))
    ) {
        throw new ValidationError('Missing required fields!');
    }

    if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format.');
    }
};

export const checkOtpRestrictions = async (email: string) => {
    const isOtpLocked = await redis.get(`otp_lock:${email}`);

    if (isOtpLocked) {
        throw new ValidationError(
            'Account locked due to multiple failed attempts. Please try again after 30 minutes.',
        );
    }

    const isOtpSpamLocked = await redis.get(`otp_spam_lock:${email}`);

    if (isOtpSpamLocked) {
        throw new ValidationError(
            'Too many OTP request. Please try again after 1 hour.',
        );
    }

    const isOtpCooldown = await redis.get(`otp_cooldown:${email}`);

    if (isOtpCooldown) {
        throw new ValidationError(
            'Please wait 1 minute before requesting new OTO',
        );
    }
};

export const sendOtp = async (
    name: string,
    email: string,
    template: string,
) => {
    const otp = crypto.randomInt(1000, 9999).toString();

    await sendMail(email, 'Verify your email', template, { name, otp });
    await redis.set(`otp:${email}`, otp, 'EX', 300);
    await redis.set(`otp_cooldown:${email}`, 'true', 'EX', 60);
};

export const trackOtpRequest = async (email: string) => {
    const otpRequestKey = `otp_request_count:${email}`;

    const otpRequest = parseInt((await redis.get(otpRequestKey)) || '0');

    if (otpRequest >= 2) {
        await redis.set(`otp_spam_lock:${email}`, 'locked', 'EX', '3600');

        throw new ValidationError(
            'Too many OTP requests. Please wait 1 hour before requesting again.',
        );
    }

    await redis.set(otpRequestKey, otpRequest + 1, 'EX', '3600');
};

export const verifyForgotPasswordOtp = async (email: string, otp: string) => {
    try {
        if (!email || !otp) {
            throw new ValidationError('Email and OTP are required');
        }

        await verifyOtp(email, otp);
    } catch (error) {
        throw new ValidationError("Couldn't verify");
    }
};

export const verifyOtp = async (email: string, otp: string) => {
    const storedOtp = await redis.get(`otp:${email}`);

    console.log('OTP FOUND', storedOtp);
    console.log('OTP SENT', otp);

    if (!storedOtp) {
        throw new ValidationError('Invalid or Expired OTP');
    }

    const failedAttemptsKey = `otp_attempts:${email}`;
    const failedAttemps = parseInt((await redis.get(failedAttemptsKey)) || '0');

    if (storedOtp !== otp) {
        if (failedAttemps >= 2) {
            await redis.set(`otp_lock:${email}`, 'locked', 'EX', 1800);
            await redis.del(`otp:${email}`, failedAttemptsKey);

            throw new ValidationError(
                'Too many attempts. Your account is locked for 30 Minutes.',
            );
        }

        await redis.set(failedAttemptsKey, failedAttemps + 1, 'EX', 300);

        throw new ValidationError(
            `Incorrect OTP. You have ${2 - failedAttemps} left`,
        );
    }

    await redis.del(`otp:${email}`, failedAttemptsKey);
};

export const handleForgotPassword = async (
    payload: any,
    userType: 'user' | 'admin',
) => {
    const { name, email } = payload;
    try {
        if (!email) {
            throw new ValidationError('Email is required');
        }

        const user =
            userType === 'user' &&
            (await prisma.users.findUnique({ where: { email } }));

        if (!user) throw new ValidationError(`${userType} not found`);

        // await checkOtpRestrictions(email);
        // await trackOtpRequest(email);

        await sendOtp(name, email, 'user-activation-mail');
    } catch (error) {
        throw new ValidationError(
            'Something went wrong with sending email',
            error,
        );
    }
};
