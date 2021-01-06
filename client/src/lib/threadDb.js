import {generateMessageForEntropy, getAddressAndSigner} from "./connectSign";
import {hashSync} from "bcryptjs";
import {BigNumber, utils} from "ethers";
import { Client, PrivateKey } from '@textile/hub';
import io from 'socket.io-client';

/**
 * generateIdentity is used to generate identity using metamask
 * @returns {Promise<PrivateKey>}
 */
export const generateIdentity = async () => {
  const metamask = await getAddressAndSigner()
  const secret = hashSync('this.state.secret this.state.secret', 10)
  console.log("SECRET:",secret)
  const message = await generateMessageForEntropy(metamask.address, 'textile-demo', secret)
  const signedText = await metamask.signer.signMessage(message);
  const hash = utils.keccak256(signedText);
  if (hash === null) {
    throw new Error('No account is provided. Please provide an account to this application.');
  }

  const array = hash
    .replace('0x', '')
    .match(/.{2}/g)
    .map((hexNoPrefix) => BigNumber.from('0x' + hexNoPrefix).toNumber())

  if (array.length !== 32) {
    throw new Error('Hash of signature is not the correct size! Something went wrong!');
  }
  const identity = PrivateKey.fromRawEd25519Seed(Uint8Array.from(array))
  console.log("identity:",identity.toString())

  return identity
}

/**
 * getIdentity is used to generate identity from Random function
 * @returns {Promise<PrivateKey|*>}
 */
export const getIdentity = async () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  try {
    if (urlParams.get('force')) {
      window.history.replaceState({}, document.title, "/");
      throw new Error('Forced new identity')
    }
    const storedIdent = localStorage.getItem("identity");
    if (storedIdent === null) {
      throw new Error('No identity')
    }
    return PrivateKey.fromString(storedIdent)
  }
  catch (e) {
    try {
      const identity = PrivateKey.fromRandom()
      const identityString = identity.toString()
      localStorage.setItem("identity", identityString)
      return identity
    } catch (err) {
      return err.message
    }
  }
}

/**
 * More secure method for getting token & API auth.
 * Keeps private key locally in the app.
 */
export const loginWithChallenge = (identity) => {
    return new Promise((resolve, reject) => {
      console.log("Trying to connect with socket!!")

      const socket = io("http://127.0.0.1:3001");

      socket.on("connect", () => {
        console.log('Connected to Server22')
        const publicKey = identity.public.toString();

        // Send public key to server
        socket.emit('message', JSON.stringify({
          pubKey: publicKey,
          type: 'token'
        }));

        socket.on("message", async (event) => {
          const data = JSON.parse(event)
          switch (data.type) {
            case 'error': {
              reject(data.value);
              break;
            }

            //solve the challenge
            case 'challenge': {
              const buf = Buffer.from(data.value)
              const signed = await identity.sign(buf)
              socket.emit("challenge", signed);
              break;
            }

            //get the token and store it
            case 'token': {
              console.log("TOKEN:",data.value)
              resolve(data.value)
              break;
            }
          }
        })
      });
    });
}

/**
 * Method for using the server to create credentials without identity
 */
export const createCredentials = async ()=> {
  const response = await fetch(`http://127.0.0.1:3001/api/userAuth`, {
    method: 'GET',
  })
  const res = await response.json();
  console.log('RES:',res)
  return res
}


/**
 * Provides a full login where
 * - pubkey is shared with the server
 * - identity challenge is fulfilled here, on client
 * - hub api token is sent from the server
 *
 * see index.html for example running this method
 */
export const login = async (id) => {
  if (!id) {
    throw Error('No user ID found')
  }

  /** Use the identity to request a new API token when needed */
  const loginCallback = await loginWithChallenge(id);
  const client = await Client.withUserAuth(loginCallback)
  console.log('Verified on Textile API')
  return client
}

export const listThread = async (client) => {
  if (!client) {
    throw Error('User not authenticated')
  }
  console.log("Client2:",client)
  /** Query for all the user's existing threads (expected none) */
  const result = await client.listThreads()

  /** Display the results */
  console.log("RESULT:", result)
}

export const simpleAuth = async (id) => {
  if (!id) {
    throw Error('No user ID found')
  }
  /** Use the simple auth REST endpoint to get API access */
  /** The simple auth endpoint generates a user's Hub API Token */
  console.log("SENDING11..")
  const client = Client.withUserAuth(createCredentials)
  /** getToken will get and store the user token in the Client */
  const token = await client.getToken(id)
  console.log('Verified on Textile API:', token)
  return client
}

export const sign = async (buf, id) => {
  if (!id) {
    throw Error('No user ID found')
  }
  return id.sign(buf)
}

