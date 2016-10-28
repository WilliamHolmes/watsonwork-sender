// A sample app that sends a message to Watson Work

import { expect } from 'chai';

// Mock the request module
let postspy;
require('request');
require.cache[require.resolve('request')].exports = {
  post: (uri, opt, cb) => postspy(uri, opt, cb)
};

const sender = require('../app');

describe('sender', () => {
  it('Sends a message to a space', (done) => {

    // Check async callbacks
    let checks = 0;
    const check = () => {
      if(++checks === 3)
        done();
    };

    postspy = (uri, opt, cb) => {
      // Expect a call to get the OAuth token of an app
      if(uri === 'https://api.watsonwork.ibm.com/oauth/token') {
        expect(opt.auth).to.deep.equal({
          user: 'testappid',
          pass: 'testsecret'
        });
        expect(opt.json).to.equal(true);
        expect(opt.form).to.deep.equal({
          grant_type: 'client_credentials'
        });

        // Return OAuth token
        setImmediate(() => cb(undefined, {
          statusCode: 200,
          body: {
            access_token: 'testaccesstoken'
          }
        }));
        check();
        return;
      }

      // Expect a call to GraphQL to retrieve a list of spaces
      if(uri === 'https://api.watsonwork.ibm.com/graphql') {
        expect(opt.headers).to.deep.equal({
          jwt: 'testaccesstoken',
          'Content-Type': 'application/graphql'
        });
        expect(opt.body.replace(/\s/g, '')).to.equal(`
          query {
            spaces (first: 50) {
              items {
                title
                id
              }
            }
          }`.replace(/\s/g, ''));

        setImmediate(() => cb(undefined, {
          statusCode: 200,
          // Return list of spaces
          body: JSON.stringify({
            data: {
              spaces: {
                items: [{
                  title: 'Test Space',
                  id: 'testspace'
                }]
              }
            }
          })
        }));
        check();
        return;
      }

      // Expect a call to send a message to the test space
      if(uri === 'https://api.watsonwork.ibm.com/teams/testspace/messages') {
        expect(opt.headers).to.deep.equal({
          Authorization: 'Bearer testaccesstoken'
        });
        expect(opt.json).to.equal(true);
        expect(opt.body).to.deep.equal({
          type: 'appMessage',
          version: 1.0,
          annotations: [{
            type: 'generic',
            version: 1.0,

            color: '#6CB7FB',
            title: 'Sample message',
            text: 'Hey',

            actor: {
              name: 'Sample app',
              avatar: 'https://avatars1.githubusercontent.com/u/22985179',
              url: 'https://github.com/watsonwork'
            }
          }]
        });
        setImmediate(() => cb(undefined, {
          statusCode: 201,
          // Return list of spaces
          body: {
          }
        }));
        check();
      }
    };

    // Run the sender app
    sender.main(
      [null, null, 'Test', 'Hey'],
      { SENDER_APP_ID: 'testappid', SENDER_APP_SECRET: 'testsecret' });
  });
});
