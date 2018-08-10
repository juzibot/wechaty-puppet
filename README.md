# WECHATY PUPPET

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
[![NPM Version](https://badge.fury.io/js/wechaty-puppet.svg)](https://badge.fury.io/js/wechaty-puppet)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Linux/Mac Build Status](https://travis-ci.com/Chatie/wechaty-puppet.svg?branch=master)](https://travis-ci.com/Chatie/wechaty-puppet)
[![Greenkeeper badge](https://badges.greenkeeper.io/Chatie/wechaty-puppet.svg)](https://greenkeeper.io/)

![chatie puppet](https://chatie.io/wechaty-puppet/images/puppet-logo.jpg)

> Picture Credit: [https://www.shareicon.net](https://www.shareicon.net/puppet-marionette-puppeteer-puppet-variant-marionette-variant-665400)

Abstract(Base) Class of Puppet Providers for Wechaty Framework.

This module is part of the [Wechaty](https://github.com/chatie/wechaty) SDK.

Learn more at:

1. Wiki: <https://github.com/Chatie/wechaty/wiki/Puppet>
1. Issue: <https://github.com/Chatie/wechaty/issues/1167>

## DOCUMENTATION

Wechaty Puppet Provider Interface Documentation can be found at <https://chatie.io/wechaty-puppet/typedoc/classes/puppet.html>

> Automatica Generated by [TypeDoc](http://typedoc.org/)

## EXAMPLE

PuppetMock: <https://github.com/chatie/wechaty-puppet-mock>

The above puppet provider is just for mocking and easy to understand. It will be a good starter when you want to develope a new puppet by yourself for fullfil your need, for example, connect Wechaty with Wechat Official Account.

### Providers

* [PuppetPadchat](https://github.com/lijiarui/wechaty-puppet-padchat) iPad API via Protocol Server, created by [@lijiarui](https://github.com/lijiarui)
* [PuppetIoscat](https://github.com/linyimin-bupt/wechaty-puppet-ioscat) iPhone App Hook API, created by [@linyimin-bupt](https://github.com/linyimin-bupt)
* [PuppetWechat4u](https://github.com/chatie/wechaty-puppet-wechat4u) Web API via HTTP, created by [@zixia](https://github.com/zixia)
* [PuppetPuppeteer](https://github.com/chatie/wechaty-puppet-puppeteer) Web API via Browser, created by [@zixia](https://github.com/zixia)
* [PuppetHostie](https://github.com/chatie/wechaty-puppet-hostie) gRPC Proxy via Chatie.io(PaaS - Puppets as a Service), created by [@zixia](https://github.com/zixia)

## DEPENDENCIES

### Peer Dependence

1. `FileBox` (npm module `file-box`) must be a _peerDependencies_ because all the Wechaty Framework needs to check `instanceof FileBox`, we must be sure all `FileBox` is the same version.
2. `MemoryCard` (npm module `memory-card`) must be a _peerDependencies_ because all the Wechaty Framework needs to check `instanceof MemoryCard`, we must be sure all `MemoryCard` is the same version.
3. `Puppet`(npm module `wechaty-puppet`) itself must be a _peer Dependencies_ for all the Puppet Providers, and should only be installed via Wechaty because all Puppet Providers should share the same Puppet Base Class with Wechaty, we must be sure all `Puppet` is the same version.

## CODING WITH PUPPET

### 1. Using SwitchState

You can get to know the puppet start/stop state from the `state` property:

1. `puppet.state.on() === 'pending'` will be true when the puppet is starting
2. `puppet.state.on() === true` will be true when the puppet is started
3. `puppet.state.off() === 'pending'` will be true when the puppet is stoping
4. `puppet.state.off() === true' will be true when the puppet is stopped

Learn more about the puppet.state at <https://github.com/zixia/state-switch>

### 2. Using Brolog

Using Brolog to output necessary log messages.

#### Get log from Brolog

```ts
import { log } from 'brolog'
```

#### Log Format

```ts
log.verbose('ModuleName', 'methodName() Your Verbose Message Here')
log.verbose('ModuleName', 'methodName() Your Silly Message Here')
```

#### Log Level

Brolog has five log levels, it should be used and follow the following rules:

| Log Level | What does it means | Usage in Puppet |
| :---      | :---               | :---            |
| `log.silly()` | There's some detail debug information | Can be used in everywhere as you like |
| `log.verbose()` | There's some debug information | Should be used at the beginning of every method() |
| ~~`log.info()`~~ | ~~There's something we need to let user know~~ | ~~Should NEVER to be used because Puppet is Library~~ |
| `log.warn()` | There's a Coverable Error | **Should not be used** unless we have to |
| `log.error()` | There's a Un-covered Error | **Should not be used** unless we have to |

## Resources

### Pure Function

* [Functional Programming Concepts: Pure Functions](https://hackernoon.com/functional-programming-concepts-pure-functions-cafa2983f757)
* [What Are Pure Functions And Why Use Them?](https://medium.com/@jamesjefferyuk/javascript-what-are-pure-functions-4d4d5392d49c)
* [Master the JavaScript Interview: What is a Pure Function?](https://medium.com/javascript-scene/master-the-javascript-interview-what-is-a-pure-function-d1c076bec976)

## AUTHOR

[Huan LI](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## COPYRIGHT & LICENSE

* Code & Docs © 2018 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
