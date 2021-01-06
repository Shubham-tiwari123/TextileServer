const express = require('express');
const {newClientDB} = require("./hub-helpers");
const dotenv = require('dotenv');
const cors = require('cors')
const app = express()
app.use(cors())
dotenv.config()
const http = require('http').createServer(app);
const Emittery = require('emittery')

const io = require('socket.io')(http,{
  cors: {
    origin: '*',
  }
});

const {getAPISig} = require("./hub-helpers");

/**
 * Endpoint for simple auth
 */
app.get('/api/userAuth', async (req, res) =>{
  const auth = await getAPISig()

  /** Include the token in the auth payload */
  const credentials = {
    ...auth,
    key: process.env.USER_API_KEY,
  };

  console.log("Credentials:", credentials)
  res.send(credentials)
})

/**
 * Socket connection for authorizing user with challenge
 */
io.on('connection', (socket)=>{
  console.log('New user connected');

  socket.on('message', async (msg) => {
    const emitter = new Emittery();
    console.log('message: ' + msg);
    try{
      const data = JSON.parse(msg);
      switch (data.type) {

        case 'token': {
          if (!data.pubKey) {
            throw new Error('missing pubkey')
          }

          const db = await newClientDB()

          const token = await db.getTokenChallenge(
            data.pubKey,
            (challenge) => {
            return new Promise((resolve, reject) => {

              //send challenge to client
              io.emit('message',JSON.stringify({
                type: 'challenge',
                value: Buffer.from(challenge).toJSON(),
              }))

              //wait for challenge to get solved
              socket.on('challenge', (sig) => {
                resolve(Buffer.from(sig))
              });

            })
          })

          console.log("token:", token)

          /** Get API authorization for the user */
          const auth = await getAPISig()

          /** Include the token in the auth payload */
          const payload = {
            ...auth,
            token: token,
            key: process.env.USER_API_KEY,
          };

          // send token to client
          io.emit('message',JSON.stringify({
            type: 'token',
            value: payload,
          }))
          console.log("DONE!!!")
          break;
        }

        case 'challenge': {
          if (!data.sig) { throw new Error('missing signature (sig)') }
          console.log("EMIT")
          await emitter.emit('challenge', data.sig);
          console.log("EMITTED")
          break;
        }
      }
    } catch (error) {
      console.error("Error:",error)
      /** Notify our client of any errors */
      /*io.emit('message',JSON.stringify({
        type: 'error',
        value: error.message,
      }))*/
    }
  });

});

http.listen(3001, ()=>{
  console.log("Listening on port: 3001")
});
