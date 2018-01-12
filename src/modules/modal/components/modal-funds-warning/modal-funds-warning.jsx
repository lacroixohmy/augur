import React from 'react'

import Styles from 'modules/modal/components/modal-funds-warning/modal-funds-warning.styles'

const ModalFundsWarning = p => (
  <section className={Styles.ModalFundsWarning}>
    <h1>WARNING</h1>
    <span>DO NOT send mainnet ETH, REP, or other cryptocurrency to this account! The Augur platform is currently in beta and running on a testnet. If you send mainnet funds they will be lost.</span>
    {p.network === 4 && <span>It looks like you are connected to the Rinkeby Testnet. To get some Rinkeby Testnet ETH, follow this link: <a href="https://faucet.rinkeby.io/">Rinkeby Faucet</a>.</span>}
  </section>
)

export default ModalFundsWarning