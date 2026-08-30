import { NextFunction, Request, Response } from 'express';
import {
    checkOtpRestrictions,
    handleForgotPassword,
    sendOtp,
    trackOtpRequest,
    validateRegistrationData,
    verifyForgotPasswordOtp,
    verifyOtp,
} from '../utils/auth.helper';
import prisma from '../../../../packages/lib/prisma';
import { AuthError, ValidationError } from '../../../../packages/error-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookies';

// Register new user
export const userRegistration = async (req: Request, res: Response) => {
    validateRegistrationData(req.body, 'user');

    const { name, email } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (existingUser) {
        throw new ValidationError('User already exists with this email!');
    }

    // await checkOtpRestrictions(email);
    // await trackOtpRequest(email);
    await sendOtp(name, email, 'user-activation-mail');

    res.status(200).json({
        message: 'OTP sent to email, Please verify your email',
    });
};

export const verifyUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { name, email, password, otp } = req.body;

    try {
        if (!name || !email || !password || !otp) {
            throw new ValidationError('Missing required fields.');
        }

        const existingUser = await prisma.users.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ValidationError('User already exists.');
        }

        await verifyOtp(email, otp);

        const hashehPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: { name, email, password: hashehPassword },
        });

        res.status(200).json({
            success: true,
            message: 'User registered successfully.',
        });
    } catch (error) {
        return next(error);
    }
};

export const loginUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ValidationError('Missing required field');
        }

        const user = await prisma.users.findUnique({ where: { email } });

        if (!user) {
            throw new AuthError("User doesn't exists!");
        }

        const isMatch = await bcrypt.compare(password, user.password!);

        if (!isMatch) {
            throw new AuthError('Invalid email or password');
        }

        const accessToken = jwt.sign(
            {
                id: user.id,
                rolw: 'user',
            },
            process.env.ACCESS_TOKEN_SECRET as string,
            {
                expiresIn: '15m',
            },
        );

        const refreshToken = jwt.sign(
            {
                id: user.id,
                rolw: 'user',
            },
            process.env.REFRESH_TOKEN_SECRET as string,
            {
                expiresIn: '7d',
            },
        );

        setCookie(res, 'refresh_token', refreshToken);
        setCookie(res, 'access_token', accessToken);

        res.status(200).json({
            message: 'Login successfull',
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (error) {
        return next(error);
    }
};

export const userForgetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        await handleForgotPassword(req.body, 'user');
    } catch (error) {
        return next(error);
    }
};

export const verifyForgotPasswor = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { email, otp } = req.body;
    try {
        await verifyForgotPasswordOtp(email, otp);
        res.status(200).json({
            message: 'OTP Verified.',
        });
    } catch (error) {
        next(error);
    }
};

export const resetUserPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.users.findUnique({ where: { email } });

        if (!user) {
            throw new ValidationError('User not found');
        }

        const isSame = await bcrypt.compare(password, user.password!);

        if (isSame) {
            throw new ValidationError(
                "New password can't be same as old password.",
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.users.update({
            where: { email },
            data: { password: hashedPassword },
        });
    } catch (error) {
        next(error);
    }
};
