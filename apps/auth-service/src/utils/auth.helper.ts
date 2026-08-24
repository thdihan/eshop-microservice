import crypto from 'crypto';
import { ValidationError } from '../../../../packages/error-handler';

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
