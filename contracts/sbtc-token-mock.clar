;; Mock sBTC Token implementing SIP-010
(impl-trait .sip-010-trait-mock.sip-010-ft-trait)

(define-fungible-token sbtc)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) (err u401))
    (ft-transfer? sbtc amount sender recipient)
  )
)

(define-read-only (get-name)
  (ok "Mock sBTC Token")
)

(define-read-only (get-symbol)
  (ok "sBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (user principal))
  (ok (ft-get-balance sbtc user))
)

(define-read-only (get-total-supply)
  (ok (ft-get-total-supply sbtc))
)

(define-read-only (get-token-uri)
  (ok none)
)

;; Mint for testing purposes
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? sbtc amount recipient)
)
