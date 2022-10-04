import ldap
import json
import os
from flask import Flask, render_template

app = Flask(__name__)

def validUser(auid):
    ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
    ldap.set_option(ldap.OPT_REFERRALS, 0)
    ldap.set_option(ldap.OPT_PROTOCOL_VERSION, 3)

    AD = ldap.initialize(os.environ['LDAP_URL'])

    base_dn = os.environ['BASE_DN']
    search_scope = ldap.SCOPE_SUBTREE
    search_filter = "(&(objectCategory=User)(|(sAMAccountName=" + auid + ")))"
    get_attributes = ['sAMAccountName']

    AD.simple_bind_s('', '')

    search = AD.search_s(base_dn, search_scope, search_filter, get_attributes)[0]

    if search[0] == None:
        return False
    else:
        return True


def userInfo(auid):
    ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
    ldap.set_option(ldap.OPT_REFERRALS, 0)
    ldap.set_option(ldap.OPT_PROTOCOL_VERSION, 3)

    AD = ldap.initialize(os.environ['LDAP_URL'])

    base_dn = os.environ['BASE_DN']
    search_scope = ldap.SCOPE_SUBTREE
    search_filter = "(&(objectCategory=User)(|(sAMAccountName=" + auid + ")))"
    get_attributes = ['sAMAccountName', 'mail', 'sn', 'givenName', 'initials', 'title']

    AD.simple_bind_s('', '')

    search = AD.search_s(base_dn, search_scope, search_filter, get_attributes)[0]

    result = dict(search[1])
    for key in result:
        result[key] = result[key][0].decode("utf-8")

    result["cn"] = search[0]

    result_json = json.dumps(result, indent = 4)
    # print(result_json)

    AD.unbind_s()

    return result_json


def userGroups(auid):
    ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
    ldap.set_option(ldap.OPT_REFERRALS, 0)
    ldap.set_option(ldap.OPT_PROTOCOL_VERSION, 3)

    AD = ldap.initialize(os.environ['LDAP_URL'])

    base_dn = os.environ['BASE_DN']
    search_scope = ldap.SCOPE_SUBTREE
    search_filter = "(&(objectCategory=User)(|(sAMAccountName=" + auid + ")))"
    get_attributes = ['dn']
    groups = []

    AD.simple_bind_s('', '')

    search = AD.search_s(base_dn, search_scope, search_filter, get_attributes)[0]

    fixed_cn = search[0].replace('\\', "\\\\")

    group_filter = "(member="+fixed_cn+")"

    group_search = AD.search_s(
        base_dn, search_scope, group_filter, ['cn', 'description'])

    for item in group_search:
        if isinstance(item[1], dict):
            group_obj = item[1]
            for key in group_obj:
                group_obj[key] = group_obj[key][0].decode("utf-8")

            groups.append(group_obj)



    AD.unbind_s()

    result_json = json.dumps(groups, indent = 4)
    # print(result_json)

    return result_json


def allInfo(auid):
    ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)
    ldap.set_option(ldap.OPT_REFERRALS, 0)
    ldap.set_option(ldap.OPT_PROTOCOL_VERSION, 3)

    AD = ldap.initialize(os.environ['LDAP_URL'])
    base_dn = os.environ['BASE_DN']
    search_scope = ldap.SCOPE_SUBTREE
    search_filter = "(&(objectCategory=User)(|(sAMAccountName=" + auid + ")))"
    get_attributes = ['sAMAccountName', 'mail', 'sn', 'givenName', 'initials', 'title']
    groups = []
    all_info = {}

    AD.simple_bind_s('', '')

    search = AD.search_s(base_dn, search_scope, search_filter, get_attributes)[0]

    if search[0] == None:
        return "No user found"

    user_result = dict(search[1])
    for key in user_result:
        user_result[key] = user_result[key][0].decode("utf-8")

    all_info['valid'] = True

    all_info['user'] = user_result

    fixed_cn = search[0].replace('\\', "\\\\")

    group_filter = "(member="+fixed_cn+")"

    group_search = AD.search_s(base_dn, search_scope, group_filter, ['cn', 'description'])

    for item in group_search:
        if isinstance(item[1], dict):
            group_obj = item[1]
            for key in group_obj:
                group_obj[key] = group_obj[key][0].decode("utf-8")

            groups.append(group_obj)
    
    all_info['groups'] = groups

    AD.unbind_s()

    result_json = json.dumps(all_info, indent = 4)

    return result_json


@app.route("/ad_api/")
def index():
    current_user = os.environ['USERNAME']
    cu_info = json.loads(getAll(current_user))
    user = json.dumps(cu_info['user'], sort_keys = True, indent = 4, separators = (',', ': '))
    groups = json.dumps(cu_info['groups'], sort_keys = True, indent = 4, separators = (',', ': '))
    valid = cu_info['valid']
    # return render_template('index.html', data=cu_info)
    return render_template('index.html', data=cu_info, valid=valid, user=user, groups=groups)

@app.route("/ad_api/validuser/<auid>")
def getValid(auid):
    isValid = validUser(auid)
    return str(isValid)

@app.route("/ad_api/userinfo/<auid>")
def getUser(auid):
    user = userInfo(auid)
    return user

@app.route("/ad_api/usergroups/<auid>")
def getGroups(auid):
    groups = userGroups(auid)
    return groups

@app.route("/ad_api/all/<auid>")
def getAll(auid):
    allinfo = allInfo(auid)
    return allinfo


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8080)