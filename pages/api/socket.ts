import socketHandler from "@chess/pages/api/socket"

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

export default socketHandler
