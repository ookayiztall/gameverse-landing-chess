(ns poker.ladder
  "Ladder is the leaderboard for player skills."
  (:require
   [clojure.spec.alpha :as s]
   [poker.specs]
   [poker.system.db    :as db]
   [crux.api           :as crux]))

(s/def ::player-id some?)
(s/def ::borrow int?)
(s/def ::returns int?)

(s/def ::player-buyin-params (s/keys :req-un [::player-id ::buyin]))
(s/def ::player-inc-hands-params (s/keys :req-un [::player-id]))
(s/def ::player-returns-params (s/keys :req-un [::player-id ::returns]))

(defn calc-score
  [player]
  (let [{:ladder/keys [hands buyin returns]} player]
    (if (and (int? hands)
             (int? buyin)
             (int? returns))
      (let [score
            (int
             (* (- returns buyin)
                (/ (+ (* 6 (Math/exp (- (Math/pow (/ hands 50) 2)))) 1))
                (- 1 (/ 0.4 (+ 1 (Math/exp (* 0.00005 (- 120000 buyin))))))))]
        (assoc player :ladder/score score))
      player)))

(defn list-leaderboard
  []
  (let [db (crux/db db/node)]
    (->>
     (crux/q
      db
      '{:find     [(pull
                    p
                    [:player/name :player/avatar :ladder/hands :ladder/buyin :ladder/returns
                     :ladder/score])
                   s],
        :where    [[p :ladder/score s]],
        :order-by [[s :desc]]})
     (mapv first))))

(defn- url-encode
  [s]
  (java.net.URLEncoder/encode (str s) "UTF-8"))

(defn- publish-to-gameverse!
  [player]
  (let [url    (System/getenv "GAMEVERSE_WEBHOOK_URL")
        secret (System/getenv "HOLDEM_WEBHOOK_SECRET")]
    (when (and (seq url)
               (seq secret)
               (string? (:player/name player))
               (int? (:ladder/score player)))
      (let [body (str "player_name=" (url-encode (:player/name player))
                      "&score=" (url-encode (:ladder/score player)))
            request (-> (java.net.http.HttpRequest/newBuilder (java.net.URI/create url))
                        (.header "content-type" "application/x-www-form-urlencoded")
                        (.header "x-holdem-secret" secret)
                        (.POST (java.net.http.HttpRequest$BodyPublishers/ofString body))
                        (.build))
            client (java.net.http.HttpClient/newHttpClient)]
        (.sendAsync client request (java.net.http.HttpResponse$BodyHandlers/ofString))))))

(defn player-inc-hands
  [params]
  {:pre [(s/valid? ::player-inc-hands-params params)]}
  (let [{:keys [player-id]} params
        db         (crux/db db/node)
        player     (crux/entity db player-id)
        new-player (update player
                           :ladder/hands
                           (fnil inc 0))]
    (crux/submit-tx db/node
                    [[:crux.tx/match player-id player]
                     [:crux.tx/put new-player]])
    (future (publish-to-gameverse! new-player))))

(defn player-buyin
  [params]
  {:pre [(s/valid? ::player-buyin-params params)]}
  (let [{:keys [player-id buyin]} params
        db         (crux/db db/node)
        player     (crux/entity db player-id)
        new-player (-> player
                       (update
                        :ladder/buyin
                        (fnil + 0)
                        buyin)
                       (calc-score))]
    (crux/submit-tx db/node
                    [[:crux.tx/match player-id player]
                     [:crux.tx/put new-player]])
    (future (publish-to-gameverse! new-player))))

(defn player-returns
  [params]
  {:pre [(s/valid? ::player-returns-params params)]}
  (let [{:keys [player-id returns]} params
        db         (crux/db db/node)
        player     (crux/entity db player-id)
        new-player (-> player
                       (update :ladder/returns
                               (fnil + 0)
                               returns)
                       (update :ladder/hands
                               (fnil inc 0))
                       (calc-score))]
    (crux/submit-tx db/node
                    [[:crux.tx/match player-id player]
                     [:crux.tx/put new-player]])
    (future (publish-to-gameverse! new-player))))
