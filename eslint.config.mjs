import config from "eslint-config-next/core-web-vitals"

export default [
  { ignores: ["vendor/**"] },
  ...config,
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/jsx-no-comment-textnodes": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]
