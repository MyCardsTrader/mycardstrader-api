import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common/pipes';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('/ (GET) health-check', () => {
    return request(app.getHttpServer())
      .get('/health-check')
      .expect(200)
      .expect('App up and running on http://localhost/3003');
  });

  it('/ (POST) user', async () => {
    const requestUser = await request(app.getHttpServer())
      .post('/user')
      .send({ email: 'nemo@nautilus.sub', password: 'aronnax'})
      .expect(201);
      userId = requestUser.body._id;
      expect(requestUser.body.availableTreasures).toBe(0);
      expect(requestUser.body.holdTreasures).toBe(0);
  });

  it('/ (POST) user fail', async () => {
    const requestUser = await request(app.getHttpServer())
      .post('/user')
      .send({ email: 'nemo@nautilus.sub' })
      .expect(400);
      expect(requestUser.body.message.length).toEqual(2);
      expect(requestUser.body.message[0]).toBe('password must be a string');
      expect(requestUser.body.message[1]).toBe('password should not be empty');
  });

  it('/ (GET) user', async () => {
    const requestUser = await request(app.getHttpServer())
      .get('/user')
      .expect(200);
      expect(requestUser.body.length).toEqual(1);
  });

  it('/ (POST) login', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nemo@nautilus.sub', password: 'aronnax'})
      .expect(201)
  });

  it('/ (DELETE) user', () => {
    return request(app.getHttpServer())
      .delete('/user')
      .send({ id: userId})
      .expect(200)
  });

  it('/ (DELETE) user fail', () => {
    return request(app.getHttpServer())
      .delete('/user')
      .send({})
      .expect(400)
  });
});
