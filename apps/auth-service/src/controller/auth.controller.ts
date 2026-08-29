import { Request, Response } from 'express';
import {
    checkOtpRestrictions,
    sendOtp,
    trackOtpRequest,
    validateRegistrationData,
} from '../utils/auth.helper';
import prisma from '../../../../packages/lib/prisma';
import { ValidationError } from '../../../../packages/error-handler';

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
