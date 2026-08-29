import express from 'express';
import cors from 'cors';
import { errorMiddleware } from '@packages/error-handler';
import cookieParser from 'cookie-parser';
import router from './routes/auth.route';
import swaggerUi from 'swagger-ui-express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const getSwaggerDocument = () => {
    const candidatePaths = [
        join(__dirname, 'swagger-output.json'),
        join(__dirname, '../swagger-output.json'),
        join(__dirname, '../../swagger-output.json'),
        join(__dirname, '../../../swagger-output.json'),
        join(process.cwd(), 'apps/auth-service/src/swagger-output.json'),
        join(process.cwd(), 'apps/auth-service/dist/src/swagger-output.json'),
        join(process.cwd(), 'dist/src/swagger-output.json'),
    ];

    for (const path of candidatePaths) {
        if (existsSync(path)) {
            return JSON.parse(readFileSync(path, 'utf-8'));
        }
    }
    return {};
};

const swaggerDocument = getSwaggerDocument();

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 6001;

const app = express();
app.use(
    cors({
        origin: ['http://localhost:3000'],
        allowedHeaders: ['Authorization', 'Content-Type'],
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send({ message: 'Hello API, this if from 6001 port' });
});

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs-json', (req, res) => {
    res.json(swaggerDocument);
});
app.use('/api', router);

app.use(errorMiddleware);

const server = app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
    console.log(`Swagger Docs available at http://localhost:${port}/docs-json`);
});

server.on('error', (err) => {
    console.log('Server Error: ', err);
});
