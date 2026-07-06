;; Continuum Vaults Contract
;; Decentralized Bitcoin-native time-locked savings protocol on Stacks

(use-trait sip-010-trait .sip-010-trait-mock.sip-010-ft-trait)

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u1001))
(define-constant ERR-VAULT-NOT-FOUND (err u1002))
(define-constant ERR-VAULT-LOCKED (err u1003))
(define-constant ERR-VAULT-INACTIVE (err u1004))
(define-constant ERR-INVALID-DURATION (err u1005))
(define-constant ERR-INSUFFICIENT-FUNDS (err u1006))
(define-constant ERR-INVALID-TOKEN (err u1007))

(define-constant CONTRACT-OWNER tx-sender)

;; Scale for rewards-per-share arithmetic (1e12)
(define-constant REWARD-SCALE u1000000000000)

;; Durations in blocks
(define-constant DURATION-30-DAYS u4320)
(define-constant DURATION-90-DAYS u12960)
(define-constant DURATION-180-DAYS u25920)
(define-constant DURATION-365-DAYS u52560)

;; Multipliers (scaled by 1000, e.g. 1.0x = 1000)
(define-constant MULTIPLIER-30-DAYS u1000)
(define-constant MULTIPLIER-90-DAYS u1200)
(define-constant MULTIPLIER-180-DAYS u1500)
(define-constant MULTIPLIER-365-DAYS u2000)

;; Treasury & config variables
(define-data-var treasury-address principal tx-sender)
(define-data-var penalty-basis-points uint u1000) ;; 10% penalty (1000/10000)
(define-data-var treasury-share-points uint u2000) ;; 20% of the penalty goes to treasury (2000/10000)
(define-data-var sbtc-contract-address principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token-mock)

;; Global tracking variables
(define-data-var total-locked-stx uint u0)
(define-data-var total-locked-sbtc uint u0)

(define-data-var total-shares-stx uint u0)
(define-data-var total-shares-sbtc uint u0)

(define-data-var acc-reward-per-share-stx uint u0)
(define-data-var acc-reward-per-share-sbtc uint u0)

(define-data-var vault-counter uint u0)

;; Data Maps
(define-map Vaults
  uint
  {
    owner: principal,
    amount: uint,
    shares: uint,
    asset-type: (string-ascii 4), ;; "STX" or "sBTC"
    unlock-at: uint,
    created-at: uint,
    last-reward-per-share: uint,
    claimable-rewards: uint,
    active: bool
  }
)

(define-map UserVaults principal (list 50 uint))

;; Private Helpers
(define-private (append-vault-id (vault-id uint) (vaults-list (list 50 uint)))
  (unwrap-panic (as-max-len? (append vaults-list vault-id) u50))
)

(define-private (get-multiplier (duration uint))
  (if (>= duration DURATION-365-DAYS)
    MULTIPLIER-365-DAYS
    (if (>= duration DURATION-180-DAYS)
      MULTIPLIER-180-DAYS
      (if (>= duration DURATION-90-DAYS)
        MULTIPLIER-90-DAYS
        MULTIPLIER-30-DAYS
      )
    )
  )
)

(define-private (is-valid-duration (duration uint))
  (or
    (is-eq duration DURATION-30-DAYS)
    (is-eq duration DURATION-90-DAYS)
    (is-eq duration DURATION-180-DAYS)
    (is-eq duration DURATION-365-DAYS)
  )
)

(define-private (calculate-pending-rewards (vault {
    owner: principal,
    amount: uint,
    shares: uint,
    asset-type: (string-ascii 4),
    unlock-at: uint,
    created-at: uint,
    last-reward-per-share: uint,
    claimable-rewards: uint,
    active: bool
  }))
  (let
    (
      (current-acc (if (is-eq (get asset-type vault) "STX")
                     (var-get acc-reward-per-share-stx)
                     (var-get acc-reward-per-share-sbtc)))
      (reward-diff (if (>= current-acc (get last-reward-per-share vault))
                     (- current-acc (get last-reward-per-share vault))
                     u0))
      (new-rewards (/ (* (get shares vault) reward-diff) REWARD-SCALE))
    )
    (+ (get claimable-rewards vault) new-rewards)
  )
)

(define-private (update-vault-rewards-internal (vault-id uint) (vault {
    owner: principal,
    amount: uint,
    shares: uint,
    asset-type: (string-ascii 4),
    unlock-at: uint,
    created-at: uint,
    last-reward-per-share: uint,
    claimable-rewards: uint,
    active: bool
  }))
  (let
    (
      (current-acc (if (is-eq (get asset-type vault) "STX")
                     (var-get acc-reward-per-share-stx)
                     (var-get acc-reward-per-share-sbtc)))
      (accrued (calculate-pending-rewards vault))
    )
    (map-set Vaults vault-id (merge vault {
      last-reward-per-share: current-acc,
      claimable-rewards: accrued
    }))
    accrued
  )
)

;; Public Admin Functions
(define-public (set-sbtc-contract (new-address principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set sbtc-contract-address new-address)
    (ok true)
  )
)

(define-public (set-treasury-address (new-address principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set treasury-address new-address)
    (ok true)
  )
)

;; Public Write Functions

;; Create a new time-locked vault
(define-public (create-vault (amount uint) (lock-period-blocks uint) (asset (string-ascii 4)) (sbtc-token <sip-010-trait>))
  (let
    (
      (vault-id (+ (var-get vault-counter) u1))
      (current-height block-height)
      (unlock-height (+ current-height lock-period-blocks))
      (multiplier (get-multiplier lock-period-blocks))
      (shares (/ (* amount multiplier) u1000))
    )
    (asserts! (is-valid-duration lock-period-blocks) ERR-INVALID-DURATION)
    (asserts! (> amount u0) ERR-INSUFFICIENT-FUNDS)

    (if (is-eq asset "STX")
      (begin
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        (var-set total-locked-stx (+ (var-get total-locked-stx) amount))
        (var-set total-shares-stx (+ (var-get total-shares-stx) shares))
        (map-set Vaults vault-id {
          owner: tx-sender,
          amount: amount,
          shares: shares,
          asset-type: "STX",
          unlock-at: unlock-height,
          created-at: current-height,
          last-reward-per-share: (var-get acc-reward-per-share-stx),
          claimable-rewards: u0,
          active: true
        })
      )
      (begin
        (asserts! (is-eq (contract-of sbtc-token) (var-get sbtc-contract-address)) ERR-INVALID-TOKEN)
        (try! (contract-call? sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
        (var-set total-locked-sbtc (+ (var-get total-locked-sbtc) amount))
        (var-set total-shares-sbtc (+ (var-get total-shares-sbtc) shares))
        (map-set Vaults vault-id {
          owner: tx-sender,
          amount: amount,
          shares: shares,
          asset-type: "sBTC",
          unlock-at: unlock-height,
          created-at: current-height,
          last-reward-per-share: (var-get acc-reward-per-share-sbtc),
          claimable-rewards: u0,
          active: true
        })
      )
    )

    (let
      (
        (existing-vaults (default-to (list) (map-get? UserVaults tx-sender)))
        (new-vaults (append-vault-id vault-id existing-vaults))
      )
      (map-set UserVaults tx-sender new-vaults)
    )

    (var-set vault-counter vault-id)
    (ok vault-id)
  )
)

;; Increase deposit of an active vault
(define-public (increase-deposit (vault-id uint) (additional-amount uint) (sbtc-token <sip-010-trait>))
  (let
    (
      (vault (unwrap! (map-get? Vaults vault-id) ERR-VAULT-NOT-FOUND))
      (current-height block-height)
    )
    (asserts! (get active vault) ERR-VAULT-INACTIVE)
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (> additional-amount u0) ERR-INSUFFICIENT-FUNDS)

    (let
      (
        (multiplier (get-multiplier (- (get unlock-at vault) (get created-at vault))))
        (additional-shares (/ (* additional-amount multiplier) u1000))
        (current-accrued (update-vault-rewards-internal vault-id vault))
      )
      (let
        (
          (updated-vault (unwrap-panic (map-get? Vaults vault-id)))
        )
        (if (is-eq (get asset-type vault) "STX")
          (begin
            (try! (stx-transfer? additional-amount tx-sender (as-contract tx-sender)))
            (var-set total-locked-stx (+ (var-get total-locked-stx) additional-amount))
            (var-set total-shares-stx (+ (var-get total-shares-stx) additional-shares))
            (map-set Vaults vault-id (merge updated-vault {
              amount: (+ (get amount updated-vault) additional-amount),
              shares: (+ (get shares updated-vault) additional-shares)
            }))
          )
          (begin
            (asserts! (is-eq (contract-of sbtc-token) (var-get sbtc-contract-address)) ERR-INVALID-TOKEN)
            (try! (contract-call? sbtc-token transfer additional-amount tx-sender (as-contract tx-sender) none))
            (var-set total-locked-sbtc (+ (var-get total-locked-sbtc) additional-amount))
            (var-set total-shares-sbtc (+ (var-get total-shares-sbtc) additional-shares))
            (map-set Vaults vault-id (merge updated-vault {
              amount: (+ (get amount updated-vault) additional-amount),
              shares: (+ (get shares updated-vault) additional-shares)
            }))
          )
        )
        (ok true)
      )
    )
  )
)

;; Extend lock period of an active vault
(define-public (extend-lock (vault-id uint) (new-lock-period-blocks uint))
  (let
    (
      (vault (unwrap! (map-get? Vaults vault-id) ERR-VAULT-NOT-FOUND))
      (current-height block-height)
    )
    (asserts! (get active vault) ERR-VAULT-INACTIVE)
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (is-valid-duration new-lock-period-blocks) ERR-INVALID-DURATION)
    (asserts! (> (+ current-height new-lock-period-blocks) (get unlock-at vault)) ERR-INVALID-DURATION)

    (let
      (
        (current-accrued (update-vault-rewards-internal vault-id vault))
      )
      (let
        (
          (updated-vault (unwrap-panic (map-get? Vaults vault-id)))
          (old-shares (get shares updated-vault))
          (new-multiplier (get-multiplier new-lock-period-blocks))
          (new-shares (/ (* (get amount updated-vault) new-multiplier) u1000))
        )
        (if (is-eq (get asset-type updated-vault) "STX")
          (var-set total-shares-stx (+ (- (var-get total-shares-stx) old-shares) new-shares))
          (var-set total-shares-sbtc (+ (- (var-get total-shares-sbtc) old-shares) new-shares))
        )
        (map-set Vaults vault-id (merge updated-vault {
          shares: new-shares,
          unlock-at: (+ current-height new-lock-period-blocks),
          created-at: current-height
        }))
        (ok true)
      )
    )
  )
)

;; Claim accrued rewards for a vault
(define-public (claim-rewards (vault-id uint) (sbtc-token <sip-010-trait>))
  (let
    (
      (vault (unwrap! (map-get? Vaults vault-id) ERR-VAULT-NOT-FOUND))
    )
    (asserts! (get active vault) ERR-VAULT-INACTIVE)
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)

    (let
      (
        (total-claimable (update-vault-rewards-internal vault-id vault))
      )
      (asserts! (> total-claimable u0) (ok u0))

      (map-set Vaults vault-id (merge (unwrap-panic (map-get? Vaults vault-id)) {
        claimable-rewards: u0
      }))

      (if (is-eq (get asset-type vault) "STX")
        (begin
          (try! (as-contract (stx-transfer? total-claimable tx-sender (get owner vault))))
          (ok total-claimable)
        )
        (begin
          (asserts! (is-eq (contract-of sbtc-token) (var-get sbtc-contract-address)) ERR-INVALID-TOKEN)
          (try! (as-contract (contract-call? sbtc-token transfer total-claimable tx-sender (get owner vault) none)))
          (ok total-claimable)
        )
      )
    )
  )
)

;; Standard withdrawal after maturity (no penalty)
(define-public (withdraw (vault-id uint) (sbtc-token <sip-010-trait>))
  (let
    (
      (vault (unwrap! (map-get? Vaults vault-id) ERR-VAULT-NOT-FOUND))
      (current-height block-height)
    )
    (asserts! (get active vault) ERR-VAULT-INACTIVE)
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (>= current-height (get unlock-at vault)) ERR-VAULT-LOCKED)

    (let
      (
        (total-claimable (update-vault-rewards-internal vault-id vault))
      )
      (let
        (
          (updated-vault (unwrap-panic (map-get? Vaults vault-id)))
          (amount-to-withdraw (get amount updated-vault))
          (shares-to-remove (get shares updated-vault))
          (payout (+ amount-to-withdraw total-claimable))
        )
        (map-set Vaults vault-id (merge updated-vault {
          active: false,
          amount: u0,
          shares: u0,
          claimable-rewards: u0
        }))

        (if (is-eq (get asset-type updated-vault) "STX")
          (begin
            (var-set total-locked-stx (- (var-get total-locked-stx) amount-to-withdraw))
            (var-set total-shares-stx (- (var-get total-shares-stx) shares-to-remove))
            (try! (as-contract (stx-transfer? payout tx-sender (get owner updated-vault))))
          )
          (begin
            (asserts! (is-eq (contract-of sbtc-token) (var-get sbtc-contract-address)) ERR-INVALID-TOKEN)
            (var-set total-locked-sbtc (- (var-get total-locked-sbtc) amount-to-withdraw))
            (var-set total-shares-sbtc (- (var-get total-shares-sbtc) shares-to-remove))
            (try! (as-contract (contract-call? sbtc-token transfer payout tx-sender (get owner updated-vault) none)))
          )
        )
        (ok payout)
      )
    )
  )
)

;; Emergency early withdrawal with a 10% penalty
(define-public (emergency-withdraw (vault-id uint) (sbtc-token <sip-010-trait>))
  (let
    (
      (vault (unwrap! (map-get? Vaults vault-id) ERR-VAULT-NOT-FOUND))
      (current-height block-height)
    )
    (asserts! (get active vault) ERR-VAULT-INACTIVE)
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (< current-height (get unlock-at vault)) ERR-VAULT-LOCKED)

    (let
      (
        (accrued-rewards (update-vault-rewards-internal vault-id vault))
      )
      (let
        (
          (updated-vault (unwrap-panic (map-get? Vaults vault-id)))
          (amount-to-withdraw (get amount updated-vault))
          (shares-to-remove (get shares updated-vault))
          (penalty (/ (* amount-to-withdraw (var-get penalty-basis-points)) u10000))
          (user-refund (- amount-to-withdraw penalty))
          (payout (+ user-refund accrued-rewards))
          (treasury-part (/ (* penalty (var-get treasury-share-points)) u10000))
          (redistribute-part (- penalty treasury-part))
        )
        (if (is-eq (get asset-type updated-vault) "STX")
          (let
            (
              (remaining-shares (- (var-get total-shares-stx) shares-to-remove))
            )
            (var-set total-locked-stx (- (var-get total-locked-stx) amount-to-withdraw))
            (var-set total-shares-stx remaining-shares)
            (try! (as-contract (stx-transfer? payout tx-sender (get owner updated-vault))))
            (if (> remaining-shares u0)
              (let
                (
                  (added-reward-share (/ (* redistribute-part REWARD-SCALE) remaining-shares))
                )
                (var-set acc-reward-per-share-stx (+ (var-get acc-reward-per-share-stx) added-reward-share))
                (try! (as-contract (stx-transfer? treasury-part tx-sender (var-get treasury-address))))
              )
              (try! (as-contract (stx-transfer? penalty tx-sender (var-get treasury-address))))
            )
          )
          (let
            (
              (remaining-shares (- (var-get total-shares-sbtc) shares-to-remove))
            )
            (asserts! (is-eq (contract-of sbtc-token) (var-get sbtc-contract-address)) ERR-INVALID-TOKEN)
            (var-set total-locked-sbtc (- (var-get total-locked-sbtc) amount-to-withdraw))
            (var-set total-shares-sbtc remaining-shares)
            (try! (as-contract (contract-call? sbtc-token transfer payout tx-sender (get owner updated-vault) none)))
            (if (> remaining-shares u0)
              (let
                (
                  (added-reward-share (/ (* redistribute-part REWARD-SCALE) remaining-shares))
                )
                (var-set acc-reward-per-share-sbtc (+ (var-get acc-reward-per-share-sbtc) added-reward-share))
                (try! (as-contract (contract-call? sbtc-token transfer treasury-part tx-sender (var-get treasury-address) none)))
              )
              (try! (as-contract (contract-call? sbtc-token transfer penalty tx-sender (var-get treasury-address) none)))
            )
          )
        )
        (map-set Vaults vault-id (merge updated-vault {
          active: false,
          amount: u0,
          shares: u0,
          claimable-rewards: u0
        }))
        (ok payout)
      )
    )
  )
)

;; Read-Only Functions

(define-read-only (get-vault (vault-id uint))
  (map-get? Vaults vault-id)
)

(define-read-only (get-user-vaults (user principal))
  (default-to (list) (map-get? UserVaults user))
)

(define-read-only (get-pending-rewards (vault-id uint))
  (match (map-get? Vaults vault-id)
    vault (if (get active vault)
            (let
              (
                (current-acc (if (is-eq (get asset-type vault) "STX")
                               (var-get acc-reward-per-share-stx)
                               (var-get acc-reward-per-share-sbtc)))
                (reward-diff (if (>= current-acc (get last-reward-per-share vault))
                               (- current-acc (get last-reward-per-share vault))
                               u0))
                (new-rewards (/ (* (get shares vault) reward-diff) REWARD-SCALE))
              )
              (ok (+ (get claimable-rewards vault) new-rewards))
            )
            (ok u0)
          )
    (err ERR-VAULT-NOT-FOUND)
  )
)

(define-read-only (get-contract-stats)
  (ok {
    total-locked-stx: (var-get total-locked-stx),
    total-locked-sbtc: (var-get total-locked-sbtc),
    total-shares-stx: (var-get total-shares-stx),
    total-shares-sbtc: (var-get total-shares-sbtc),
    vault-counter: (var-get vault-counter)
  })
)
