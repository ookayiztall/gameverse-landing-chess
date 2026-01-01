(ns postcss
  (:require
   [clojure.java.io :as io]
   [babashka.process :as proc]))

(defn- node-bin
  []
  (let [windows? (re-find #"(?i)windows" (System/getProperty "os.name"))
        nvm-symlink (System/getenv "NVM_SYMLINK")
        program-files (System/getenv "ProgramFiles")
        candidates (cond-> []
                     (and windows? nvm-symlink)
                     (conj (str nvm-symlink "\\node.exe"))

                     (and windows? program-files)
                     (conj (str program-files "\\nodejs\\node.exe")))
        resolved (some (fn [path]
                         (when (and path (.exists (io/file path)))
                           path))
                       candidates)]
    (or resolved (if windows? "node.exe" "node"))))

(defn- postcss-command
  []
  [(node-bin) "node_modules/postcss-cli/bin/postcss"])

(defn watch
  {:shadow.build/stage :configure}
  [build-state src dst]
  (proc/process (concat (postcss-command) [src "-o" dst "--verbose" "-w"])
                {:env {"TAILWIND_MODE" "watch"}})
  build-state)

(defn release
  {:shadow.build/stage :configure}
  [build-state src dst]
  (-> (proc/process (concat (postcss-command) [src "-o" dst "--verbose"])
        {:env {"NODE_MODE" "production"}})
    (proc/check))
  build-state)
