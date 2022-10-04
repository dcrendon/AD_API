const path = require('path')
const ldap = require('ldapjs');
const fastify = require('fastify')({ logger: false })
const helmet = require('@fastify/helmet')
// const pino = require('pino')
// const logger = pino({
//     transport: {
//       target: 'pino-pretty'
//     },
//     level: 'trace'
// })

const client = ldap.createClient({
  url: 'process.env.LDAP_URL',
  tlsOptions: {rejectUnauthorized: false},
  reconnect: true,
  // timeout: 1000,
  // idleTimeout: 1000
})
client.on('connect', (connection) => {
  // console.log("LDAP Connection Success");
  // console.log(connection);
})
client.on('timeout', (err) => {
  console.log("timed out: " + err)
})
client.on('error', (err) => {
  // console.log(err);
})
client.on('destroy', () => {
  console.log("ldap client destoryed");
})

const validUser = (auid, callback) => {
  client.bind('', '', (err) => {
    if(err) {
      callback(err)
      return
    }

    const opts = {
      filter: `(&(|(agencyUID=${auid})))`,
      scope: 'sub',
      attributes: ['agencyUID']
    };
  
    client.search(process.env.BASE_DN, opts, (err, res) => {
      let user = ""
  
      res.on('searchEntry', (entry) => {
        user = JSON.stringify(entry.object)
        // console.log(JSON.stringify(entry));
        // callback(JSON.stringify(entry.object))
      });
  
      res.on('error', (err) => {
        console.error('error: ' + err.message);
      });
  
      res.on('end', (result) => {
        if(user == ""){
          user = false
          callback(user)
        }
        else{
          user = true
          callback(user)
        }
        // client.destroy()
        client.unbind((err) => {})
      });
    })
  });
}

const findUser = (auid, callback) => {
  client.bind('', '', (err) => {
    if(err) {
      callback(err)
      return
    }

    const opts = {
      filter: `(&(|(agencyUID=${auid})))`,
      scope: 'sub',
      attributes: ['agencyUID', 'mail', 'sn', 'givenName', 'initials', 'title']
    };
  
    client.search(process.env.BASE_DN, opts, (err, res) => {
      let user = ""
  
      res.on('searchEntry', (entry) => {
        user = entry.object
      });
  
      res.on('error', (err) => {
        console.error('error: ' + err.message);
      });
  
      res.on('end', (result) => {
        if(user == ""){
          user = "No user found."
        }
        callback(user)
        // client.destroy()
        client.unbind((err) => {})
      });
    })
  });
}

const findUserGroups = (auid, callback) => {
  client.bind('', '', (err) => {
    if(err) {
      callback(err)
      return
    }
    const opts = {
      filter: `(&(|(agencyUID=${auid})))`,
      scope: 'sub',
      attributes: ['agencyUID', 'mail', 'sn', 'givenName', 'initials', 'title']
    };
    client.search(process.env.BASE_DN, opts, (err, res) => {
      let user = ""
  
      res.on('searchEntry', (entry) => {
        user = entry.object
      });
  
      res.on('error', (err) => {
        console.error('error: ' + err.message);
      });
  
      res.on('end', (result) => {
        if(user == ""){
          user = {}
        }
        groupSearch(user)
      });
    })
    const groupSearch = (userObj) => {
      // const dn = userObj.dn.replace("\\", "\\\\")
      const dn = "NDC\\\\dcrendon"
      const opts = {
        filter: `(member=${dn})`,
        scope: 'sub',
      }
      client.search(process.env.BASE_DN, opts, (err, res) => {
        let groups = []
        res.on('searchEntry', (entry) => {
          const group = entry.object
          groups.push(group)
        });
        res.on('error', (err) => {
          console.error('error: ' + err.message);
        });
        res.on('end', (result) => {
          if(groups.length == 0){
            groups = "No groups found"
          }
          callback(groups)
          client.unbind((err) => {})
        });
      })
    }
  })
}

const allInfo = (auid, callback) => {
  client.bind('', '', (err) => {
    if(err) {
      callback(err)
      return
    }
    const opts = {
      filter: `(&(|(agencyUID=${auid})))`,
      scope: 'sub',
      attributes: ['agencyUID']
    };
    client.search(process.env.BASE_DN, opts, (err, res) => {
      let user = ""
      res.on('searchEntry', (entry) => {
        user = JSON.stringify(entry.object)
      });
      res.on('error', (err) => {
        console.error('error: ' + err.message);
      });
  
      res.on('end', (result) => {
        if(user == ""){
          user = {}
          callback(user)
        }
        else{
          user = true
          findUser(auid)
        }
      });
    })
    const findUser = (auid) => {
      const opts = {
        filter: `(&(|(agencyUID=${auid})))`,
        scope: 'sub',
        attributes: ['agencyUID', 'mail', 'sn', 'givenName', 'initials', 'title']
      };
      client.search("dc=nasa,dc=gov", opts, (err, res) => {
        let user = ""
    
        res.on('searchEntry', (entry) => {
          user = entry.object
        });
    
        res.on('error', (err) => {
          console.error('error: ' + err.message);
        });
    
        res.on('end', (result) => {
          if(user == ""){
            user = {}
          }
          groupSearch(user)
        });
      })
    }
    const groupSearch = (userObj) => {
      const dn = userObj.dn.replace("\\", "\\\\")
      const opts = {
        filter: `(member=${dn})`,
        scope: 'sub',
        attributes: ['cn', 'description']
      }
      client.search("dc=nasa,dc=gov", opts, (err, res) => {
        let groups = []
        res.on('searchEntry', (entry) => {
          const group = entry.object
          groups.push(group)
        });
        res.on('error', (err) => {
          console.error('error: ' + err.message);
        });
        res.on('end', (result) => {
          if(groups.length == 0){
            groups = "No groups found"
          }
          const allInfo = {
            isValidUser: true,
            user: userObj,
            groups: groups
          }
          callback(allInfo)
          client.unbind((err) => {})
        });
      })
    }
  })
}

fastify.register(helmet, { global: true })

fastify.register(require("@fastify/view"), {
  engine: {
    eta: require("eta"),
  },
})

fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/ad_api/public/',
})

fastify.get('/ad_api/', (request, reply) => {
  allInfo("dcrendon", (allInfo) => {
    if(allInfo.error) reply.send(allInfo)
    reply.view("index.eta", allInfo)
  })
})

fastify.get('/ad_api/userinfo/:auid', (request, reply) => {
    const { auid } = request.params
    findUser(auid, (user) => {
      reply.send(user)
    })
})

fastify.get('/ad_api/usergroups/:auid', (request, reply) => {
    const { auid } = request.params
    findUserGroups(auid, (groups) => {
      reply.send(groups)
    })
})

fastify.get('/ad_api/validuser/:auid', (request, reply) => {
    const { auid } = request.params
    validUser(auid, (isValid) => {
      reply.send(isValid)
    })
})

fastify.get('/ad_api/all/:auid', (request, reply) => {
    const { auid } = request.params
    allInfo(auid, (allInfo) => {
      reply.send(allInfo)
    })
})

fastify.listen({port: process.env.PORT.trim()})