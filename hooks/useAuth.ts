import { AuthContext } from "@/context/AuthContext"
import { useContext } from "react"

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("UseAuth must be used withing a AuthProvider...!")
    }
    return context
}