# 🛡️ Grace  
### *Because servers deserve to panic **politely*** 💀

![License](https://img.shields.io/badge/license-MIT-black)
![Status](https://img.shields.io/badge/status-surviving%20under%20pressure-green)
![Infra](https://img.shields.io/badge/vibes-infrastructure%20only-blue)
![Failure](https://img.shields.io/badge/failure-controlled-orange)

---

## 😈 What the hell is Grace?

**Grace** is an overload protection + circuit breaker layer that sits in front of your backend and asks one brutal question:

> **“Should this request even be allowed right now?”**

When things go south — traffic spikes, backends choke, dependencies die —  
Grace doesn’t let your server go full *school-website-in-exam-week* mode 💀

Instead, it:
- blocks new traffic
- serves a calm holding page
- protects the backend
- recovers automatically
- judges silently

No crashes.  
No panic restarts.  
No 3AM SSH trauma.

---

## 💥 Why Grace exists

Most apps fail like this:


- traffic → backend → 💀💀💀


Grace changes the script:


-     traffic → Grace → backend (maybe)
                  ↑
             vibes check


If the backend is having a bad day, Grace simply says:

> “Nah. Not today.”

---

## 🔥 What Grace actually does

Grace **gracefully refuses traffic** when:

- CPU is crying
- memory is screaming
- load average is suspicious
- backend latency goes insane
- dependencies stop responding
- something *feels* off

It doesn’t wait for the server to die.  
It steps in **before embarrassment**.

---

## 🧠 What Grace is NOT

Let’s be clear so nobody gets delusional:

❌ Not Cloudflare  
❌ Not a DDoS shield  
❌ Not magic  
❌ Not invincible  

Grace **will not** save you from:
- bandwidth floods
- kernel panics
- your ISP giving up
- a meteor

Grace **will** save you from:
- backend meltdowns
- timeout storms
- violent crashes
- “why is prod dead” moments

---

## 🚨 Failure, but make it classy

When overload happens:

- existing requests finish
- new requests get blocked or redirected
- backend pressure drops instantly
- users see a calm holding page
- logs actually make sense
- system recovers on its own

Failure becomes **boring**.

And boring failure is peak infrastructure 🗿

---

## 🧪 Tested under chaos

Grace has been tested with:
- sustained load
- random-IP floods
- backend crashes
- backend recovery
- long-running pressure (minutes, not seconds)

Result:
- backend died ❌
- system died ❌
- guardian panicked ❌
- recovery manual ❌

Grace just… handled it 😐

---

## 🖥️ Holding page

Grace serves a minimal holding page during overload:

- white background
- big error icon
- calm text
- auto retry every few seconds
- zero images
- zero dependencies

Because if you’re overloaded, the **last thing you need is more load** 💀

---

## ⚙️ How it decides to block you

Grace can trigger overload based on:

- CPU usage
- memory usage
- system load
- active connections
- backend availability
- backend timeout & error rate

If **any** of these go bad → lockdown.

Hardware lies.  
Latency doesn’t.

---

## 🧠 Philosophy (important)

Grace does not try to handle infinite traffic.

Grace assumes:
- systems have limits
- backends die first
- traffic spikes are inevitable
- pretending otherwise is stupid

The goal is not to prevent failure.

The goal is to **control how failure happens**.

---

## 😎 Who should use this?

Grace is perfect for:
- personal sites
- portfolios
- APIs
- self-hosted apps
- indie projects
- startups before they can afford “real infra”
- anyone tired of servers dying dramatically

---

## 🧨 Who should NOT use this?

If you need:
- nation-state protection
- terabit-scale mitigation
- bulletproof network filtering

Yeah… that’s Cloudflare money 💸

Grace is **application-layer sanity**, not global defense.

---

## 📜 License

MIT License.

Do whatever you want.
Break it.
Ship it.
Rename it.
Blame it.

---

## 🪦 Final words

Grace will not make your backend immortal.

It will make your system:
- honest
- predictable
- recoverable
- less embarrassing

And honestly?

That’s already better than most of the internet 💀🔥
