import { createContext, useContext } from 'react'

/** `ready` flips true when the intro starts handing over to the hero. */
export const IntroContext = createContext({ ready: true })
export const useIntro = () => useContext(IntroContext)
