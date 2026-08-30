import express, { Router } from 'express';
import {
    loginUser,
    resetUserPassword,
    userForgetPassword,
    userRegistration,
    verifyForgotPasswor,
    verifyUser,
} from '../controller/auth.controller';

const router: Router = express.Router();

router.post('/user-registration', userRegistration);
router.post('/verify-user', verifyUser);
router.post('/login', loginUser);
router.post('/forgot-password', userForgetPassword);
router.post('/reset-password-user', resetUserPassword);
router.post('/verify-forgot-password', verifyForgotPasswor);

export default router;
