import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

type LoginResponseBody = {
  accessToken: string;
  user: {
    email: string;
  };
};

const parseLoginResponseBody = (body: unknown): LoginResponseBody => {
  if (!body || typeof body !== 'object') {
    throw new Error('Expected login response body to be an object');
  }

  const bodyRecord = body as Record<string, unknown>;
  const accessToken = bodyRecord.accessToken;
  const user = bodyRecord.user;

  if (typeof accessToken !== 'string') {
    throw new Error('Expected accessToken to be a string');
  }

  if (!user || typeof user !== 'object') {
    throw new Error('Expected user to be an object');
  }

  const userRecord = user as Record<string, unknown>;
  const email = userRecord.email;
  if (typeof email !== 'string') {
    throw new Error('Expected user.email to be a string');
  }

  return {
    accessToken,
    user: {
      email,
    },
  };
};

describe('Service Desk API (e2e)', () => {
  let app: INestApplication;
  const httpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as unknown as Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/auth/health should return auth module health check', () => {
    return request(httpServer())
      .get('/api/auth/health')
      .expect(200)
      .expect({ ok: true });
  });

  it('POST /api/auth/login should return access token for predefined user', async () => {
    const response = await request(httpServer())
      .post('/api/auth/login')
      .send({
        email: 'suporte@service-desk.local',
        password: '123456',
      })
      .expect(201);

    const loginBody = parseLoginResponseBody(response.body as unknown);
    expect(loginBody.accessToken).toBeTruthy();
    expect(loginBody.user.email).toBe('suporte@service-desk.local');
  });

  it('GET /api/tickets should return 401 without token', () => {
    return request(httpServer()).get('/api/tickets').expect(401);
  });

  it('GET /api/tickets should return 200 with valid token', async () => {
    const loginResponse = await request(httpServer())
      .post('/api/auth/login')
      .send({
        email: 'suporte@service-desk.local',
        password: '123456',
      })
      .expect(201);

    const loginBody = parseLoginResponseBody(loginResponse.body as unknown);

    const ticketsResponse = await request(httpServer())
      .get('/api/tickets')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    expect(Array.isArray(ticketsResponse.body as unknown)).toBe(true);
  });
});
