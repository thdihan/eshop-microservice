import crypto from 'crypto';
import { ValidationError } from '../../../../packages/error-handler';
import redis from '../../../../packages/lib/redis';
import { sendMail } from './sendMail';

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

    let otpRequest = parseInt((await redis.get(otpRequestKey)) || '0');

    if (otpRequest >= 2) {
        await redis.set(`otp_spam_lock:${email}`, 'locked', 'EX', '3600');

        throw new ValidationError(
            'Too many OTP requests. Please wait 1 hour before requesting again.',
        );
    }

    await redis.set(otpRequestKey, otpRequest + 1, 'EX', '3600');
};
