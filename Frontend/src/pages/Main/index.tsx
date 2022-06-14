import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useKeplr } from "../../features/accounts/useKeplr";

import { Wrapper, ConnectWalletButton } from "./styled";

const Main: React.FC = () => {
  const account = useAppSelector((state) => state.accounts.keplrAccount);
  const { connect } = useKeplr();

  const clickWalletButton = () => {
    if (!account) {
      connect();
    }
  };
  return (
    <Wrapper>
      {account ? (
        <Switch>
          {/* <Route exact={false} path="/profile" component={MyNFT} />
          <Route
            exact={false}
            path="/collections/marketplace"
            component={Marketplace}
          />
          <Route
            exact={false}
            path="/collections/explore"
            component={ExploreMarketplace}
          />
          <Route exact={false} path="/collections/mint" component={Mint} />
          <Route exact={false} path="/detail" component={NFTDetail} />
          <Route exact path="/" component={Home} />
          <Redirect to="/profile" /> */}
        </Switch>
      ) : (
        <ConnectWalletButton onClick={clickWalletButton}>
          Connect
        </ConnectWalletButton>
      )}
      <Switch>
        {/* <Route exact={false} path="/profile" component={MyNFT} />
        <Route
          exact={false}
          path="/collections/marketplace"
          component={Marketplace}
        />
        <Route
          exact={false}
          path="/collections/explore"
          component={ExploreMarketplace}
        />
        <Route exact={false} path="/collections/mint" component={Mint} />
        <Route exact={false} path="/detail" component={NFTDetail} />
        <Route exact path="/" component={Home} />
        <Redirect to="/profile" /> */}
      </Switch>
    </Wrapper>
  );
};

export default Main;
