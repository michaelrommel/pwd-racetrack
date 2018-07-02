'use strict'

const apiserver = require('../../test/server')
const headers = require('../../test/headers')

var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect

chai.use(dirtyChai)

describe('ROUTE: /home', function () {
  it('v1 should say hello ci-test-account', (done) => {
    apiserver
      .get('/home')
      .set('Authorization', headers.Authorization)
      .set('Accept-Version', '~1')
      .expect('Content-type', /json/)
      .expect(200) // THis is HTTP response
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        expect(res.body.error).to.be.undefined()
        expect(res.body.hello).to.equal('ci-test-account')

        return done()
      })
  })
  it('v2 should say welcome ci-test-account', (done) => {
    apiserver
      .get('/home')
      .set('Authorization', headers.Authorization)
      .set('Accept-Version', '~2')
      .expect('Content-type', /json/)
      .expect(200) // THis is HTTP response
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        expect(res.body.error).to.be.undefined()
        expect(res.body.welcome).to.equal('ci-test-account')

        return done()
      })
  })
})
