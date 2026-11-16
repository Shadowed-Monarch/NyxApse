// Run:  node tools/test_namefilter.js   (checks the nickname filter against tricky names)
const fs = require('fs'), path = require('path');
global.window = {};
require('vm').runInThisContext(fs.readFileSync(path.join(__dirname, '../js/namefilter.js'), 'utf8') + ';globalThis.N = NXName;');
const bad = ['shit', 'sh.t', 'sh1t', '$hit', 's h i t', 'shiiiit', 'f.u.c.k', 'fuuuck', 'FuCk', 'f*ck', 'b!tch', 'a.s.s', 'ass', 'ass69', 'sex', 's3x', 'nigger', 'n1gg3r', 'admin', 'Admin_01', 'NyxApse', 'c u n t', 'my.phone.0501234567', 'visit www.x', 'dick', 'd1ck', 'kys', 'paki', 'nazi', 'rape', 'h1tler', 'p0rn', 'm0d', 'official', 'fck', 'sht', 'sh-t', 'sh_t', 'f.ck'];
const good = ['Shadow', 'Cassidy', 'Essex', 'Sussex', 'Scunthorpe', 'Peacock', 'Hancock', 'Analysis', 'Grape', 'Therapist', 'Classic', 'Bassist', 'Assassin', 'Nazir', 'Nazim', 'Janus', 'Pakistan', 'Rapello', 'Skyler', 'FoxyBrain', 'Mia_2024', 'Badminton', 'Torpedo', 'Swank', 'Niger', 'Tiger9', 'Cocoon', 'Raccoon', 'Moderate', 'Devon', 'Bob', 'Sam.Smith', 'Peninsula', 'Shiitake', 'Dickens', 'Spice', 'Despicable', 'Cumin', 'Titan', 'Title', 'Mr.Brain', 'Dr.Who', 'Pro.Gamer', 'Ali.Khan', 'Sara_K'];
let problems = 0;
bad.forEach(n => { if (N.check(n).ok) { console.log('NOT BLOCKED:', n); problems++; } });
good.forEach(n => { if (!N.check(n).ok) { console.log('WRONGLY BLOCKED:', n); problems++; } });
console.log('checked', bad.length, 'bad and', good.length, 'good names. Problems:', problems);
process.exit(problems ? 1 : 0);
