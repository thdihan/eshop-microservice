import express from 'express';
import cors from 'cors';
import { errorMiddleware } from '../../../packages/error-handler/error-middleware';
import cookieParser from 'cookie-parser';

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

app.use(errorMiddleware);

const server = app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
});

server.on('error', (err) => {
    console.log('Server Error: ', err);
});
