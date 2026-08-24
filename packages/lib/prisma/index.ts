/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-namespace */
import { PrismaClient } from '@prisma/client/extension';

declare global {
    namespace globalThis {
        var prismadb: PrismaClient;
    }
}

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production') global.prismadb = prisma;

export default prisma;
