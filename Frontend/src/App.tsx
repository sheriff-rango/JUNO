import React, { useEffect } from "react";
import {
  // HashRouter,
  Router,
} from "react-router-dom";
import { createBrowserHistory } from "history";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path";
import { ToastContainer } from "react-toastify";
import Main from "./pages/Main";
// import {
//   //  useAppDispatch,
//   useAppSelector,
// } from "./app/hooks";
// import { deleteAccount } from "./features/accounts/accountsSlice";
// import useContract from "./hook/useContract";
// import useFetch from "./hook/useFetch";

import "./App.css";
import "react-toastify/dist/ReactToastify.css";
import useContract from "./hook/useContract";
import { useAppSelector } from "./app/hooks";

const history = createBrowserHistory();

setBasePath(
  "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.0.0-beta.64/dist/"
);
function App() {
  const { initContracts } = useContract();
  const account = useAppSelector((state) => state.accounts.keplrAccount);

  useEffect(() => {
    if (account) {
      initContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="main">
      <Router history={history}>
        <Main />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          hideProgressBar
          newestOnTop
          closeOnClick
          theme="colored"
        />
      </Router>
    </div>
  );
}

export default App;
