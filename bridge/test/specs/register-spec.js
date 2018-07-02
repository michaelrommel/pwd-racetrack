'use strict'

const apiserver = require('../../test/server')

var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect

chai.use(dirtyChai)

describe('ROUTE: /register', () => {
  it('should be a bad request without name', (done) => {
    apiserver
      .post('/register')
      .send({ role: 'test' })
      .expect('Content-type', /json/)
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        expect(res.status).to.equal(400)
        expect(res.body.code).to.equal('BadRequest')
        expect(res.body.message).to.equal('Incomplete registration information.')

        done()
      })
  })
  it('should be a bad request without role', (done) => {
    apiserver
      .post('/register')
      .send({ name: 'ci-test-account' })
      .expect('Content-type', /json/)
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        expect(res.status).to.equal(400)
        expect(res.body.code).to.equal('BadRequest')
        expect(res.body.message).to.equal('Incomplete registration information.')

        done()
      })
  })
  it('should be a bad request without a password', (done) => {
    apiserver
      .post('/register')
      .send({
        name: 'ci-test-account',
        role: 'test'
      })
      .expect('Content-type', /json/)
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        expect(res.status).to.equal(400)
        expect(res.body.code).to.equal('BadRequest')
        expect(res.body.message).to.equal('Incomplete registration information.')

        done()
      })
  })
  it('should only return usename and role with token', (done) => {
    apiserver
      .post('/register')
      .send({
        name: 'ci-test-account',
        role: 'test',
        password: 'some-hashed-password'
      })
      .expect('Content-type', /json/)
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        // no errors
        expect(res.status).to.equal(200)
        expect(res.body.error).to.be.undefined()

        // matches input
        expect(res.body.name).to.equal('ci-test-account')
        expect(res.body.role).to.equal('test')
        expect(res.body.password).to.be.undefined()

        // has output
        expect(res.body.token).to.not.be.undefined()
        expect(res.body.token).to.not.be.empty()
        expect(res.body.token).to.be.a('string').that.is.not.empty()

        done()
      })
  })
})
