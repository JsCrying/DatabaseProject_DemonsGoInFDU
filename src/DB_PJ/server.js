var http = require('http');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs');
var url = require('url');

const express = require('express');
const app = express();
//connect postgresql config
var pg = require('pg');
/*var conString = "tcp://postgres:7758258yzh!@localhost/demons go"; //tcp://用户名:密码@localhost/数据库名
var client =  new pg.Client(conString);*/
var config_db = {
    user: "postgres",
    database: "demons go",
    password: "7758258yzh!",
    port: 4160,

    // 扩展属性
    max:30, // 连接池最大连接数
    idleTimeoutMillis:5000 // 连接最大空闲时间 3s
}
var pool = new pg.Pool(config_db);

//global info
var username = '';
var chname = '';
var demon_backpack = new Array();
var demon_record_str = "";

//load local file to server config
app.use('/public', express.static('public'));

//ejs config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//hmac_md5
var safe = require('./public/safe_md5');

//sql control string
var sql = require('./public/sql');
const { render } = require('ejs');
const { response } = require('express');


//running server framework

//welcome page
app.all('/', (request, response) => {
    username = '';
    chname = '';
    response.sendFile(__dirname + "/views/home.html");
});
//player login page
app.get('/plogin', (request, response) => {
    username = '';
    chname = '';
    response.render("plogin_get.ejs", {
        message: ''
    });
});
//players input login information to login
app.post('/plogin', (request, response) => {
    let body = "";
    let flag = 0;
    request.on('data', chunk => {
        body += chunk;
    });
    request.on('end', () => {
        body = querystring.parse(body);
        username = body.username;
        let password = body.password;
        password = safe.hex_hmac_md5(password, username);
        //console.log(password);
        //query
        pool.connect(function(err, client, done) { 
            if(err) {
                return console.error('sql connect error!', err);
            }
            client.query(sql.judge_playeraccount, function(err, result) {
            done();//release connect
            if(err) {
                return console.error('query error!', err);
            }
            let len = result.rowCount;
            for (let i = 0; i < len; ++i) {
                if (result.rows[i].username === username && result.rows[i].pass_word === password) {
                    flag = 1;
                    break;
                }
            }
            if (flag === 1)
                response.render("plogin_post.ejs", {
                    username: username
                });
            else
                response.render("plogin_get.ejs", {
                    message: 'Bad username or password'
                });
            });
        });
    });
});
//register page
app.get('/register', (request, response) => {
    response.render("register_get.ejs", {
        message: ''
    });
});
//players input information to register
app.post('/register', (request, response) => {
    let body = "";
    request.on('data', chunk => {
        body += chunk;
    });
    request.on('end', () => {
        body = querystring.parse(body);
        username = body.username;
        let password = body.password;
        let e_password = body.e_password;
        let len;
        let flag;
        if (!(username && password && password === e_password)) {
            response.render("register_get.ejs", {
                message: 'Please ensure your username or password...'
            });
        }
        else {
            password = safe.hex_hmac_md5(password, username);
            //console.log(password);
            let insert_paccount = "insert into paccounts values($1, $2, $3)";
            pool.connect(function(err, client, done) { 
                if (err) {
                    return console.error('sql connect error!', err);
                }
                function judge_repeated(client, sql_s, callback) {
                    client.query(sql_s, (error, result) => {
                        if (error) {
                            console.log("query error!", error);
                            client.end();
                        }
                        if (result.rowCount > 0)
                            callback(result);
                    });
                }
                judge_repeated(client, sql.is_repeatedname, (result) => {
                    len = result.rowCount;
                    flag = 0;
                    for (let i = 0; i < len; ++i) {
                        if (result.rows[i].username === username) {
                            flag = 1;
                            break;
                        }
                    }
                    function insert_info(client, sql_s, callback) {
                        if (flag === 0) {
                            client.query(sql_s, [len + 1, username, password], () => {
                                client.end();
                                callback();
                            });
                        }
                        else
                            callback();
                    }
                    insert_info(client, insert_paccount, function() {
                        if (flag === 1) {
                            response.render("register_get.ejs", {
                                message: 'This name has been used...'
                            });   
                        }
                        else {
                            response.render("register_post.ejs", {
                                username: username
                            });
                        }
                    });
                });
                done();//release connect
            });
        }
    });
});
//player main game page
app.get('/pgame', (request, response) => {
    response.render("pgame_get.ejs", {
        username: username,
        status: ''
    });
});
//ch login page
app.get('/chlogin', (request, response) => {
    username = '';
    chname = '';
    response.render("chlogin_get.ejs", {
        message: ''
    });
});
//ch input information to login
app.post('/chlogin', (request, response) => {
    let body = "";
    let flag = 0;
    request.on('data', chunk => {
        body += chunk;
    });
    request.on('end', () => {
        body = querystring.parse(body);
        chname = body.chname;
        let password = body.chpassword;
        //password = safe.hex_hmac_md5(password, username);
        //console.log(password);
        let sql = "select * from chaccounts";
        //query
        pool.connect(function(err, client, done) { 
            if(err) {
                return console.error('sql connect error!', err);
            }
            client.query(sql, function(err, result) {
            done();//release connect
            if(err) {
                return console.error('query error!', err);
            }
            let len = result.rowCount;
            for (let i = 0; i < len; ++i) {
                if (result.rows[i].username === chname && result.rows[i].pass_word === password) {
                    flag = 1;
                    break;
                }
            }
            if (flag === 1)
                response.render("chlogin_post.ejs", {
                    chname: chname
                });
            else
                response.render("chlogin_get.ejs", {
                    message: 'Bad username or password'
                });
            });
        });
    });
});
//ch main game page
app.get('/chgame', (request, response) => {
    response.render("chgame_get.ejs", {
        chname: chname,
        add_status: ''
    });
});
//catch demons
app.get('/catch', (request, response) => {
    response.render("catch_get.ejs", {
        username: username
    });
});


//ajax operation

//player
//show currency
app.get('/currency', (request, response) => {
    //console.log('currency');
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function show_currency(client, sql_s, callback) {
            client.query(sql_s, [username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                if (result.rowCount > 0)
                    callback(result);
            });
        }
        show_currency(client, sql.show_currency, (result) => {
            let dmoney = result.rows[0].dmoney;
            let ddiamond = result.rows[0].ddiamond;
            response.send({
                'dmoney': dmoney,
                'ddiamond': ddiamond
            });
        });
        done();//release connect
    });
});
//show illustration
app.get('/illustration', (request, response) => {
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function show_illustration(client, sql_s, callback) {
            client.query(sql_s, (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                if (result.rowCount > 0)
                    callback(result);
            });
        }
        show_illustration(client, sql.see_illustration, (res) => {
            let len = res.rowCount;
            let result = new Array(len);
            for (let i = 0; i < len; ++i) {
                result[i] = res.rows[i];
            }
            result.sort((a, b) => {
                return a.did - b.did;
            });
            let restr = "<table id = 'illustration_t' border = '2px'>";
            restr += "<tr>";
            restr += "<td>" + "did" + "</td>";
            restr += "<td>" + "dname" + "</td>";
            restr += "<td>" + "evolution_phase" + "</td>";
            restr += "<td>" + "dorientation" + "</td>";
            restr += "</tr>";
            for (let i = 0; i < len; ++i) {
                restr += "<tr>";
                restr += "<td>" + result[i].did + "</td>";
                restr += "<td>" + result[i].dname + "</td>";
                restr += "<td>" + result[i].evolution_phase + "</td>";
                restr += "<td>" + result[i].dorientation + "</td>";
                restr += "</tr>";
            }
            restr += "</table>";
            response.send(restr);
        });
        done();//release connect
    });
});
//throw ball to catch demons
app.get('/throw_ball', (request, response) => {
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function throw_ball(client, sql_s, callback) {
            //gurantee catch 1 stage demon
            let did = safe.randomNUM(1, 50);
            if (did % 2 === 0)
                did -= 1;
            client.query(sql_s, [did, username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                if (result.rowCount > 0)
                    callback(result);
            });
        }
        throw_ball(client, sql.catch_demon, (res) => {
            //console.log(res);
            function new_catch(client, sql_s, callback) {
                client.query(sql_s, (error, result) => {
                    if (error) {
                        console.log("query error!", error);
                        client.end();
                    }
                    if (result.rowCount > 0)
                        callback(result);                });
            }
            new_catch(client, sql.new_catch, (res) => {
                let restr = "<p id = 'get_info'>You get dmoney: 400, symbol of every demon add: 1</p>";
                restr += "<table id = 'demon_info' border = '2px'>";
                restr += "<tr>";
                restr += "<td>" + "ctime" + "</td>";
                restr += "<td>" + "dname" + "</td>";
                restr += "<td>" + "dlevel" + "</td>";
                restr += "<td>" + "talent" + "</td>";
                restr += "</tr>";
                //new catch demon information
                restr += "<tr>";
                restr += "<td>" + res.rows[0].ctime + "</td>";
                restr += "<td>" + res.rows[0].dname + "</td>";
                restr += "<td>" + res.rows[0].dlevel + "</td>";
                restr += "<td>" + res.rows[0].talent + "</td>";
                restr += "</tr>";
                restr += "</table>";
                response.send(restr);
            });
        });
        done();//release connect
    });
});
//transfer dmoney to ddiamond
app.get('/transfer', (request, response) => {
    //get and parse dmoney information
    let query = querystring.parse(request.url.split('?')[1]);
    let dmoney = query.dmoney;
    //console.log(typeof(dmoney));
    //console.log(dmoney);
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function m2d(client, sql_s, callback) {
            client.query(sql_s, [username, dmoney], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                if (result.rowCount > 0)
                    callback(result);
            });
        }
        if (dmoney % 10 !== 0)
            response.render("pgame_get.ejs", {
                username: username,
                status: 'Status: Please input legal dmoney num!'
            });
        else {
            m2d(client, sql.dmoney_to_ddiamond, (result) => {
                if (result.rows[0].dmoney_to_ddiamond === 'no sufficient dmoney!') {
                    response.render("pgame_get.ejs", {
                        username: username,
                        status: 'Status: No sufficient dmoney!'
                    });
                }
                else {
                    response.render("pgame_get.ejs", {
                        username: username,
                        status: 'Status: Transfer success!'
                    });
                }
            });
        }
        done();//release connect
    });
});
//check demons in backpack
app.get('/backpack', (request, response) => {
    demon_backpack = new Array();
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function open_backpack(client, sql_s, callback) {
            client.query(sql_s, [username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                callback(result);
            });
        }
        open_backpack(client, sql.open_backpack, (res) => {
            //console.log(res);
            let len = res.rowCount;
            let restr = "";
            restr += "<p class = 'baclpack_notie'>Your demons are listed here...</p>";
            restr += "<p class = 'baclpack_notie'>upgrade a demon will consume you dmoney, ddiamond, symbol</p>";
            restr += "<p class = 'baclpack_notie'>abandon a demon will return you symbols and dmoney partly</p>";
            restr += "<p id = 'operation_status'></p>";
            restr += "<table id = 'backpack_list' border = '2px'>";
            restr += "<tr>";
            restr += "<td>" + "ctime" + "</td>";
            restr += "<td>" + "dname" + "</td>";
            restr += "<td>" + "dlevel" + "</td>";
            restr += "<td>" + "talent" + "</td>";
            restr += "<td>" + "symbol_number" + "</td>";
            restr += "<td>" + "UPGRADE" + "</td>";
            restr += "<td>" + "ABANDON" + "</td>";
            restr += "</tr>";
            //simplify ctime and sort by ctime
            //handle read in date
            for (let i = 0; i < len; ++i) {
                let d = new Date(res.rows[i].ctime);
                let s = safe.getNowFormatDate(d);
                //let s = new String(d.toLocaleString());
                res.rows[i].ctime = s;
                demon_backpack[i] = res.rows[i];
            }
            demon_backpack.sort((a, b) => {
                return a.nid - b.nid;
            });
            for (let i = 0; i < len; ++i) {
                restr += "<tr>";
                restr += "<td>" + demon_backpack[i].ctime + "</td>";
                restr += "<td>" + demon_backpack[i].dname + "</td>";
                restr += "<td>" + demon_backpack[i].dlevel + "</td>";
                restr += "<td>" + demon_backpack[i].talent + "</td>";
                restr += "<td>" + demon_backpack[i].symbol_number + "</td>";
                restr += "<td>" + "<button onclick = 'upgrade_demon(" + (i).toString() + ")'>" + "UPGRADE</button>" + "</td>";
                restr += "<td>" + "<button onclick = 'abandon_demon(" + (i).toString() + ")'>" + "ABANDON</button>" + "</td>";
                restr += "</tr>";
            }
            restr += "</table>";
            response.send(restr);
        });
        done();//release connect
    });
});
//upgrade demon
app.get('/upgrade', (request, response) => {
    let query = querystring.parse(request.url.split('?')[1]);
    let index = query.index;
    let demon = demon_backpack[index];
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function upgrade(client, sql_s, callback) {
            client.query(sql_s, [demon.dname, demon.nid, username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                callback(result);
            });
        }
        upgrade(client, sql.upgrade_demon, (result) => {
            let log_str = 'Status: ' + result.rows[0].upgrade_demon + '(click OPEN or CLOSE to refresh information)';
            //console.log(log_str);
            demon_backpack = new Array();
            function open_backpack(client, sql_s, callback) {
                client.query(sql_s, [username], (error, result) => {
                    if (error) {
                        console.log("query error!", error);
                        client.end();
                    }
                    callback(result);
                });
            }
            open_backpack(client, sql.open_backpack, (res) => {
                //console.log(res);
                let len = res.rowCount;
                let restr = "";
                restr += "<p class = 'baclpack_notie'>Your demons are listed here...</p>";
                restr += "<p class = 'baclpack_notie'>upgrade a demon will consume you dmoney, ddiamond, symbol</p>";
                restr += "<p class = 'baclpack_notie'>abandon a demon will return you symbols and dmoney partly</p>";
                restr += "<p id = 'operation_status'></p>";
                restr += "<table id = 'backpack_list' border = '2px'>";
                restr += "<tr>";
                restr += "<td>" + "ctime" + "</td>";
                restr += "<td>" + "dname" + "</td>";
                restr += "<td>" + "dlevel" + "</td>";
                restr += "<td>" + "talent" + "</td>";
                restr += "<td>" + "symbol_number" + "</td>";
                restr += "<td>" + "UPGRADE" + "</td>";
                restr += "<td>" + "ABANDON" + "</td>";
                restr += "</tr>";
                //simplify ctime and sort by ctime
                //handle read in date
                for (let i = 0; i < len; ++i) {
                    let d = new Date(res.rows[i].ctime);
                    let s = safe.getNowFormatDate(d);
                    //let s = new String(d.toLocaleString());
                    res.rows[i].ctime = s;
                    demon_backpack[i] = res.rows[i];
                }
                demon_backpack.sort((a, b) => {
                    return a.nid - b.nid;
                });
                for (let i = 0; i < len; ++i) {
                    restr += "<tr>";
                    restr += "<td>" + demon_backpack[i].ctime + "</td>";
                    restr += "<td>" + demon_backpack[i].dname + "</td>";
                    restr += "<td>" + demon_backpack[i].dlevel + "</td>";
                    restr += "<td>" + demon_backpack[i].talent + "</td>";
                    restr += "<td>" + demon_backpack[i].symbol_number + "</td>";
                    restr += "<td>" + "<button onclick = 'upgrade_demon(" + (i).toString() + ")'>" + "UPGRADE</button>" + "</td>";
                    restr += "<td>" + "<button onclick = 'abandon_demon(" + (i).toString() + ")'>" + "ABANDON</button>" + "</td>";
                    restr += "</tr>";
                }
                restr += "</table>";
                response.send({
                    restr: restr,
                    log_str: log_str
                });
            });
        });
        done();//release connect
    });
});
//abandon dmeon
app.get('/abandon', (request, response) => {
    let query = querystring.parse(request.url.split('?')[1]);
    let index = query.index;
    let demon = demon_backpack[index];
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function abandon(client, sql_s, callback) {
            client.query(sql_s, [demon.nid, demon.dname, '2021-06-01T16:00:00.000Z', username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                callback(result);
            });
        }
        abandon(client, sql.abandon_demon, (result) => {
            //console.log(result);
            let log_str = 'Status: ' + result.rows[0].abandon_demon + '(click OPEN or CLOSE to refresh information)';
            //console.log(log_str);
            demon_backpack = new Array();
            function open_backpack(client, sql_s, callback) {
                client.query(sql_s, [username], (error, result) => {
                    if (error) {
                        console.log("query error!", error);
                        client.end();
                    }
                    callback(result);
                });
            }
            open_backpack(client, sql.open_backpack, (res) => {
                //console.log(res);
                let len = res.rowCount;
                let restr = "";
                restr += "<p class = 'baclpack_notie'>Your demons are listed here...</p>";
                restr += "<p class = 'baclpack_notie'>upgrade a demon will consume you dmoney, ddiamond, symbol</p>";
                restr += "<p class = 'baclpack_notie'>abandon a demon will return you symbols and dmoney partly</p>";
                restr += "<p id = 'operation_status'></p>";
                restr += "<table id = 'backpack_list' border = '2px'>";
                restr += "<tr>";
                restr += "<td>" + "ctime" + "</td>";
                restr += "<td>" + "dname" + "</td>";
                restr += "<td>" + "dlevel" + "</td>";
                restr += "<td>" + "talent" + "</td>";
                restr += "<td>" + "symbol_number" + "</td>";
                restr += "<td>" + "UPGRADE" + "</td>";
                restr += "<td>" + "ABANDON" + "</td>";
                restr += "</tr>";
                //simplify ctime and sort by ctime
                //handle read in date
                for (let i = 0; i < len; ++i) {
                    let d = new Date(res.rows[i].ctime);
                    let s = safe.getNowFormatDate(d);
                    //let s = new String(d.toLocaleString());
                    res.rows[i].ctime = s;
                    demon_backpack[i] = res.rows[i];
                }
                demon_backpack.sort((a, b) => {
                    return a.nid - b.nid;
                });
                for (let i = 0; i < len; ++i) {
                    restr += "<tr>";
                    restr += "<td>" + demon_backpack[i].ctime + "</td>";
                    restr += "<td>" + demon_backpack[i].dname + "</td>";
                    restr += "<td>" + demon_backpack[i].dlevel + "</td>";
                    restr += "<td>" + demon_backpack[i].talent + "</td>";
                    restr += "<td>" + demon_backpack[i].symbol_number + "</td>";
                    restr += "<td>" + "<button onclick = 'upgrade_demon(" + (i).toString() + ")'>" + "UPGRADE</button>" + "</td>";
                    restr += "<td>" + "<button onclick = 'abandon_demon(" + (i).toString() + ")'>" + "ABANDON</button>" + "</td>";
                    restr += "</tr>";
                }
                restr += "</table>";
                response.send({
                    restr: restr,
                    log_str: log_str
                });
            });
        });
        done();//release connect
    });
});
//check demon record
app.get('/record', (request, response) => {
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function record(client, sql_s, callback) {
            client.query(sql_s, [username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                callback(result);
            });
        }
        record(client, sql.check_record, (res) => {
            let len = res.rowCount;
            if (len === 0)
                response.end();
            let result = new Array();
            for (let i = 0; i < len; ++i) {
                let d = new Date(res.rows[i].ctime);
                let s = safe.getNowFormatDate(d);
                res.rows[i].ctime = s;
                result[i] = res.rows[i];
            }
            result.sort((a, b) => {
                return a.cid - b.cid;
            });
            let restr = "<table id = 'record_t' border = '2px'>";
            restr += "<tr>";
            restr += "<td>" + "username" + "</td>";
            restr += "<td>" + "ctime" + "</td>";
            restr += "<td>" + "dname" + "</td>";
            restr += "<td>" + "op" + "</td>";
            restr += "</tr>";
            for (let i = 0; i < len; ++i) {
                restr += "<tr>";
                restr += "<td>" + username + "</td>";
                restr += "<td>" + result[i].ctime + "</td>";
                restr += "<td>" + result[i].dname + "</td>";
                restr += "<td>" + result[i].op + "</td>";
                restr += "</tr>";
            }
            restr += "</table>";
            response.send(restr);
        });
        done();//release connect
    });
});
//check demon record by time
app.get('/record_bytime', (request, response) => {
    let query = querystring.parse(request.url.split('?')[1]);
    let begin_t = query.begin_t;
    let end_t = query.end_t;
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function record(client, sql_s, callback) {
            client.query(sql_s, [begin_t, end_t, username], (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                callback(result);
            });
        }
        record(client, sql.check_record_bytime, (res) => {
            //console.log(res);
            let len = res.rowCount;
            if (len === 0) {
                demon_record_str = "";
                response.redirect(302, '/show_record_bytime');
            }
        
            else {
                let result = new Array();
                for (let i = 0; i < len; ++i) {
                    let d = new Date(res.rows[i].ctime);
                    let s = safe.getNowFormatDate(d);
                    res.rows[i].ctime = s;
                    result[i] = res.rows[i];
                }
                result.sort((a, b) => {
                    return a.cid - b.cid;
                });
                demon_record_str = "";
                demon_record_str = "<table id = 'record_bytime_t' border = '2px'>";
                demon_record_str += "<tr>";
                demon_record_str += "<td>" + "username" + "</td>";
                demon_record_str += "<td>" + "ctime" + "</td>";
                demon_record_str += "<td>" + "dname" + "</td>";
                demon_record_str += "<td>" + "op" + "</td>";
                demon_record_str += "</tr>";
                for (let i = 0; i < len; ++i) {
                    demon_record_str += "<tr>";
                    demon_record_str += "<td>" + username + "</td>";
                    demon_record_str += "<td>" + result[i].ctime + "</td>";
                    demon_record_str += "<td>" + result[i].dname + "</td>";
                    demon_record_str += "<td>" + result[i].op + "</td>";
                    demon_record_str += "</tr>";
                }
                demon_record_str += "</table>";
                response.redirect(302, '/show_record_bytime');
                //response.render('record_bytime_get.ejs');
            }
        });
        done();//release connect
    });  
});
app.get('/show_record_bytime', (request, response) => {
    response.render('record_bytime_get.ejs');
});
app.get('/show_result', (request, response) => {
    //console.log(demon_record_str);
    response.send(demon_record_str);
});

//ch
//show illustration
app.get('/ch_illustration', (request, response) => {
    pool.connect(function(err, client, done) { 
        if (err) {
            return console.error('sql connect error!', err);
        }
        function show_ch_illustration(client, sql_s, callback) {
            client.query(sql_s, (error, result) => {
                if (error) {
                    console.log("query error!", error);
                    client.end();
                }
                if (result.rowCount > 0)
                    callback(result);
            });
        }
        show_ch_illustration(client, sql.see_illustration, (res) => {
            let len = res.rowCount;
            let result = new Array(len);
            for (let i = 0; i < len; ++i) {
                result[i] = res.rows[i];
            }
            result.sort((a, b) => {
                return a.did - b.did;
            });
            let restr = "<table id = 'ch_illustration_t' border = '2px'>";
            restr += "<tr>";
            restr += "<td>" + "did" + "</td>";
            restr += "<td>" + "dname" + "</td>";
            restr += "<td>" + "evolution_phase" + "</td>";
            restr += "<td>" + "dorientation" + "</td>";
            restr += "</tr>";
            for (let i = 0; i < len; ++i) {
                restr += "<tr>";
                restr += "<td>" + result[i].did + "</td>";
                restr += "<td>" + result[i].dname + "</td>";
                restr += "<td>" + result[i].evolution_phase + "</td>";
                restr += "<td>" + result[i].dorientation + "</td>";
                restr += "</tr>";
            }
            restr += "</table>";
            response.send(restr);
        });
        done();//release connect
    });
});
//add new demon in illustration
app.get('/ch_add_demon', (request, response) => {
    let query = querystring.parse(request.url.split('?')[1]);
    let dname = query.dname;
    let select_evo_ph = query.select_evo_ph;
    let select_do = query.select_do;
    //console.log(query.dname);
    let did = 50;
    let flag = 1;
    let len;
    if (!dname) {
        response.render('chgame_get.ejs', {
            chname: chname,
            add_status: 'Please input new demon name...'
        });
    }
    else {
        pool.connect(function(err, client, done) { 
            if (err) {
                return console.error('sql connect error!', err);
            }
            function check_repeated_demon(client, sql_s, callback) {
                client.query(sql_s, (error, result) => {
                    if (error) {
                        console.log("1query error!", error);
                        client.end();
                    }
                    callback(result);
                });
            }
            check_repeated_demon(client, sql.check_repeated_demon, (result) => {
                len = result.rowCount;
                for (let i = 0; i < len; ++i) {
                    did = did > result.rows[i].did ? did : result.rows[i].did;
                    if (result.rows[i].dname === dname) {
                        flag = 0;
                        break;
                    }
                }
                function ch_add_demon(client, sql_s, callback) {
                    if (flag === 1) {
                        client.query(sql_s, [dname, select_evo_ph, select_do, did + 1], (error) => {
                            if (error) {
                                console.log("2query error!", error);
                                client.end();
                            }
                            callback();
                        });
                    }
                    else {
                        callback();
                    } 
                }
                ch_add_demon(client, sql.add_demon, () => {
                    if (flag === 1) {
                        response.render('chgame_get.ejs', {
                            chname: chname,
                            add_status: 'Succeed to add new demon!'
                        });
                    }
                    else {
                        response.render('chgame_get.ejs', {
                            chname: chname,
                            add_status: 'Fail to add new demon because this demon is existing...'
                        });
                    }
                });
            });
            done();//release connect
        });
    }
});

//listen server
app.listen(8888, () => {
    console.log("server started, 8888 port is being listened...");
});