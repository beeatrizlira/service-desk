import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { bootstrap } from './main';

type BootstrapAppMock = {
  setGlobalPrefix: jest.Mock<void, [string]>;
  enableCors: jest.Mock<void, []>;
  useGlobalPipes: jest.Mock<void, [ValidationPipe]>;
  listen: jest.Mock<Promise<void>, [number | string]>;
};

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn(),
  },
}));

const nestFactoryMock = NestFactory as unknown as {
  create: jest.Mock;
};

const buildAppMock = (): BootstrapAppMock => ({
  setGlobalPrefix: jest.fn<void, [string]>(),
  enableCors: jest.fn<void, []>(),
  useGlobalPipes: jest.fn<void, [ValidationPipe]>(),
  listen: jest.fn<Promise<void>, [number | string]>().mockResolvedValue(),
});

describe('main bootstrap', () => {
  const previousPort = process.env.PORT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (previousPort === undefined) {
      delete process.env.PORT;
      return;
    }

    process.env.PORT = previousPort;
  });

  it('should configure prefix, CORS, validation and default port', async () => {
    delete process.env.PORT;

    const appMock = buildAppMock();
    nestFactoryMock.create.mockResolvedValue(appMock);

    await bootstrap();

    expect(nestFactoryMock.create).toHaveBeenCalledTimes(1);
    expect(appMock.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(appMock.enableCors).toHaveBeenCalledTimes(1);
    expect(appMock.useGlobalPipes).toHaveBeenCalledWith(
      expect.any(ValidationPipe),
    );
    expect(appMock.listen).toHaveBeenCalledWith(3001);
  });

  it('should use PORT from environment when provided', async () => {
    process.env.PORT = '3050';

    const appMock = buildAppMock();
    nestFactoryMock.create.mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.listen).toHaveBeenCalledWith('3050');
  });
});
