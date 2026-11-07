import bcrypt from 'bcryptjs'
import { stdin, stdout } from 'node:process'

function promptHidden(label) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Run this command in an interactive terminal so the password is not echoed.'))
      return
    }

    stdout.write(label)
    let value = ''
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          stdin.off('data', onData)
          stdin.setRawMode(false)
          stdin.pause()
          stdout.write('\n')
          reject(new Error('Password generation cancelled.'))
          return
        }
        if (character === '\r' || character === '\n') {
          stdin.off('data', onData)
          stdin.setRawMode(false)
          stdin.pause()
          stdout.write('\n')
          resolve(value)
          return
        }
        if (character === '\u0008' || character === '\u007f') value = value.slice(0, -1)
        else if (character >= ' ') value += character
      }
    }

    stdin.setEncoding('utf8')
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

try {
  const password = await promptHidden('Manager password (input hidden): ')
  const confirmation = await promptHidden('Confirm manager password (input hidden): ')
  if (!password || password !== confirmation) throw new Error('The password entries must match and cannot be empty.')
  if (bcrypt.truncates(password)) throw new Error('Bcrypt supports passwords up to 72 UTF-8 bytes; use a shorter password.')

  const hash = await bcrypt.hash(password, 12)
  stdout.write('Set MANAGER_PASSWORD_HASH in the server-side Vercel environment to this bcrypt hash:\n')
  stdout.write(hash + '\n')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
