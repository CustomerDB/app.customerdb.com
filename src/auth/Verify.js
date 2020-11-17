import React, { useContext, useEffect, useState } from "react";

import { Loading } from "../util/Utils.js";

import { useNavigate } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";

export default function Verify() {
  const firebase = useContext(FirebaseContext);

  const urlParams = new URLSearchParams(window.location.search);
  const oobCode = urlParams.get("oobCode");
  const email = urlParams.get("email");

  const navigate = useNavigate();

  const sendVerifyEmailFunc = firebase
    .functions()
    .httpsCallable("auth-sendVerifyEmail");

  const [verificationSucceeded, setVerificationSucceeded] = useState();
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (verificationSucceeded) {
      navigate("/orgs");
    }
  }, [verificationSucceeded]);

  useEffect(() => {
    firebase
      .auth()
      .checkActionCode(oobCode)
      .then((info) => {
        return firebase
          .auth()
          .signInWithEmailLink(email, window.location.href)
          .then((result) => {
            setVerificationSucceeded(true);
          });
      })
      .catch(() => {
        setVerificationSucceeded(true);
      });
  }, []);

  if (verificationSucceeded === undefined) {
    return <Loading />;
  }

  return (
    <div>
      <h1>Could not verify email</h1>
      {emailSent ? (
        <p>
          Click{" "}
          <a
            href="#"
            onClick={() => {
              sendVerifyEmailFunc({ email: email }).then(() => {
                setEmailSent(true);
              });
            }}
          >
            here to resend
          </a>{" "}
          the verification email
        </p>
      ) : (
        <p>Email sent</p>
      )}
    </div>
  );
}
