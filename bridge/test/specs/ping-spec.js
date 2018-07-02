'use strict'

const apiserver = require('../../test/server')

var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect

chai.use(dirtyChai)

describe('ROUTE: /ping', () => {
  it('should say OK', (done) => {
    apiserver
      .get('/ping')
      .expect('Content-type', /json/)
      .expect(200)
      .end((err, res) => {
        if (err) {
          console.log(err.message)
          return done(new Error('Supertest encountered an error'))
        }

        expect(res.body.error).to.be.undefined()
        expect(res.body.ping).to.equal('OK')

        done()
      })
  })
})
