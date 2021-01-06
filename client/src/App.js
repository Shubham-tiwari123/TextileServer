import React from "react";
import './App.css'
import {generateIdentity, getIdentity, login, simpleAuth} from "./lib/threadDb";

function App() {

  const loginWithMetamaskIdentity = async ()=>{
    const identity = await generateIdentity();
    const client = await login(identity)
    console.log("USER VERIFIED!!!")
  }

  const loginWithSimpleIdentity = async ()=>{
    const identity = await getIdentity();
    const client = await login(identity);
    console.log("USER VERIFIED!!")
  }

  const loginWithoutChallenge = async ()=>{
    const identity = await getIdentity();
    const client = await simpleAuth(identity);
    console.log("SUCCESSFUL!!!")
  }

  return (
      <div className="App">
        <button onClick={loginWithMetamaskIdentity}>Login with metamask</button><br/><br/>
        <button onClick={loginWithSimpleIdentity}>Login without metamask</button><br/><br/>
        <button onClick={loginWithoutChallenge}>Login without challenge</button>
      </div>
  );
}

export default App;
