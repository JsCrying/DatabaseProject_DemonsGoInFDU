//in func plogin_post()
exports.judge_playeraccount = "select * from paccounts";
//in func chlogin_post()
exports.judge_chaccount = "select * from chaccounts";
//in func register_post()
exports.is_repeatedname = `
    select * 
    from paccounts
`;
//in func register_post() to insert paccounts
exports.insert_paccount = "insert into paccounts values($1, $2, $3)";

//in func see_illustration() to see all demons
exports.see_illustration = `
    select did, dname, evolution_phase, dorientation
    from illustration
`;

//in func check_demons() to see all the demons the user has
exports.check_demons = `
    select dname, dlevel, talent, symbol_number, ctime count(all dname) as damount
    from backpack
    where username = $1
`;
//check new catch demon
exports.new_catch = `
    select ctime, dname, dlevel, talent
    from backpack
    where nid = (
        select max(nid)
        from backpack
    )
`;
//in func catch_demon(did, usrname) to catch single demon
exports.catch_demon = "select catch_demon($1, $2)";

//in func sign_up(usrname, password) to sign up
exports.sign_up = "select sign_up($1, $2)";

//in func abandon_demon(nid, dname, ctime, username) to abandon the demon
exports.abandon_demon = "select abandon_demon($1, $2, $3, $4)";

//in func upgrade_demon(dname, nid, username) to upgrade the demon
exports.upgrade_demon = "select upgrade_demon($1, $2, $3)";

//in func dmoney_to_ddiamond(username, dmoney) to change dmoney into ddiamond
exports.dmoney_to_ddiamond = "select dmoney_to_ddiamond($1, $2)";

//in func check_repeated_demon to check if new demon is existed and get the max did and add 1 to it to save as the new demon's did
exports.check_repeated_demon = "select dname, did from illustration";

//in func add_demon(dname, evo_ph, do, did) to add new demon
exports.add_demon = `
    insert into illustration
        values($1, $2, $3, $4);
`;

//in func update_do(did, do) to change the dorientation of the demon
exports.update_do = `
    update illustration
        set dorientation = $1
        where did = $2;
`;

//in func open_back to check demons in your backpack
exports.open_backpack = `
    select nid, ctime, dname, dlevel, talent, symbol_number
    from backpack
    where username = $1;
`;
//in func check_record
/*exports.check_record = `
    select cid, username, ctime, dname, op
    from demon_record
    where username = $1
`*/
exports.check_record = `
    select cid, username, ctime, dname, op
    from op_of_users
    where username = $1
`

//in func check_record_bytime(from_time, to_time, username) to check the demon you have cuaght or abandoned
/*exports.check_record_bytime = `
    select cid, username, ctime, dname, op
    from demon_record
    where (ctime between $1 and $2) and (username = $3)
`;*/
exports.check_record_bytime = `
    select cid, username, ctime, dname, op
    from op_of_users
    where (ctime between $1 and $2) and (username = $3)
`

//show currency, including dmoney, ddiamond
exports.show_currency = `
select dmoney, ddiamond
from currency
where username = $1
`;