import { firebase } from "@firebase/app"
import "@firebase/firestore"
import "@firebase/auth"
import firebaseConfig from "./firebase.config"

firebase.initializeApp(firebaseConfig)

const Auth = firebase.auth()
const Db = firebase.firestore()

export {
	Auth,
	Db
}
