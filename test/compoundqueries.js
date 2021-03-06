//---------------------------------------------------------------------------------------------------------------------------------
// File: compoundqueries.js
// Contents: test suite for verifying support of batched queries for mssql node.js driver
//
// Copyright Microsoft Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//
// You may obtain a copy of the License at:
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//---------------------------------------------------------------------------------------------------------------------------------

var sql = require('../');
var assert = require( 'assert' );
var config = require( './test-config' );
var commonTestFns = require('./CommonTestFunctions');
var supp = require('../demo-support');
var util = require( 'util' );

suite('compoundqueries', function () {
    var theConnection;
    var tablename = "compoundqueries_table";
    var testname = 'not set yet';

    var conn_str = config.conn_str;
    var support = new supp.DemoSupport(sql, conn_str);
    var async = new support.Async();

    setup(function (test_done) {
        commonTestFns.debugComments("\ncalling sql.open(...) with conn_str= \" " + conn_str + "\" \n");
        sql.open(conn_str, function (err, new_conn) {
            assert.ifError(err);
            theConnection = new_conn;
            test_done();
        });
    });

    teardown(function (done) {
        theConnection.close(function (err) {
                assert.ifError(err);
                done();
            }
        );
    });

    test('check row count emission is as expected for compound queries 1 insert', function(test_done) {
        var expected = [1];
        var received = [];

        var cmd = [
            'create table rowsAffectedTest (id int, val int)',
            'insert into rowsAffectedTest values (1, 5)',
            'drop table rowsAffectedTest'
        ];

        var batch = cmd.join(';');
        var q = theConnection.query(batch, function(err, res) {
            assert.ifError(err);
        });

        q.on('rowcount', function (count) {
            received.push(count);
            if (received.length == expected.length) {
                assert.deepEqual(expected, received);
                test_done();
            }
        })
    });

    test('check row count emission is as expected for compound queries 3 inserts, update all', function(test_done) {
        var expected = [1, 1, 1, 3];
        var received = [];

        var cmd = [
            'create table rowsAffectedTest (id int)',
            'insert into rowsAffectedTest values (1)',
            'insert into rowsAffectedTest values (1)',
            'insert into rowsAffectedTest values (1)',
            'update rowsAffectedTest set id = 1',
            'drop table rowsAffectedTest'
        ];

        var batch = cmd.join(';');
        var q = theConnection.query(batch, function(err, res) {
            assert.ifError(err);
        });

        q.on('rowcount', function (count) {
            received.push(count);
            if (received.length == expected.length) {
                assert.deepEqual(expected, received);
                test_done();
            }
        })
    });

    test('check row count emission is as expected for compound queries 4 inserts, 2 updates, 2 updates, update all', function(test_done) {
        var expected = [1, 1, 1, 1, 2, 2, 4];
        var received = [];

        var cmd = [
            'create table rowsAffectedTest (id int, val int)',
            'insert into rowsAffectedTest values (1, 5)',
            'insert into rowsAffectedTest values (2, 10)',
            'insert into rowsAffectedTest values (3, 20)',
            'insert into rowsAffectedTest values (4, 30)',

            'update rowsAffectedTest set val = 100  where id in (1, 2)',
            'update rowsAffectedTest set val = 100  where id in (3, 4)',
            'update rowsAffectedTest set val = 100  where id in (1, 2, 3, 4)',

            'drop table rowsAffectedTest'
        ];

        var batch = cmd.join(';');
        var q = theConnection.query(batch, function(err, res) {
            assert.ifError(err);
        });

        q.on('rowcount', function (count) {
            received.push(count);
            if (received.length == expected.length) {
                assert.deepEqual(expected, received);
                test_done();
            }
        })
    });

    testname = 'test 001 - batched query: SELECT....; INSERT ....; SELECT....;';
    test(testname, function (done) {
        var testcolumnsize = 100;
        var testcolumntype = " varchar(" + testcolumnsize + ")";
        var testcolumnclienttype = "text";
        var testcolumnsqltype = "varchar";
        var testcolumnname = "col2";
        var testdata1 = null;
        var testdata2Expected = "string data row 2";
        var testdata2TsqlInsert = "'" + testdata2Expected + "'";
        var tsql = "SELECT * FROM " + tablename + " ORDER BY id;  INSERT INTO " + tablename + " (" + testcolumnname + ") VALUES (" + testdata1 + ");SELECT * FROM " + tablename + " ORDER BY id;";

        var expected1 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                [[1, null],
                    [2, testdata2Expected]]
        };

        var expected2 = {
            meta:
                null,
            rowcount:
                -1
        };

        var expected3 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                [[1, null],
                    [2, testdata2Expected],
                    [3, null]]
        };

        var fns =
            [
                function (async_done) {
                    commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, function() {
                        async_done();
                    });
                },
                function (async_done) {
                    commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, function() {
                        async_done();
                    });
                },
                function (async_done) {
                    commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, function () {
                        async_done();
                    });
                },
                function (async_done) {
                    commonTestFns.compoundQueryTSQL(theConnection, tsql, expected1, expected2, expected3, testname, function() {
                        async_done();
                    });
                }
            ];

        async.series(fns, function() {
            done();
        });  // end of async.series()
    }); // end of test()

    testname = 'test 002 - batched query: SELECT....; PRINT ....; SELECT....;';
    test(testname, function (done) {
        var testcolumnsize = 100;
        var testcolumntype = " varchar(" + testcolumnsize + ")";
        var testcolumnclienttype = "text";
        var testcolumnsqltype = "varchar";
        var testcolumnname = "col2";
        var testdata1 = null;
        var testdata2Expected = "string data row 2";
        var testdata2TsqlInsert = "'" + testdata2Expected + "'";
        var tsql = "SELECT * FROM " + tablename + " ORDER BY id;  PRINT 'hello B.O.B.';SELECT * FROM " + tablename + " ORDER BY id;";

        var expected1 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                [[1, null],
                    [2, testdata2Expected]]
        };

        var expected2 = {
            meta:
                null,
            rowcount:
                -1
        };

        var fns = [
            function (async_done) {
                commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, function() {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, function () {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, function () {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.compoundQueryTSQL(theConnection, tsql, expected1, expected2, expected1, testname, function () {
                    async_done();
                });
            }
        ];

        async.series(fns, function () {
            done();
        });  // end of async.series()
    }); // end of test()

    testname = 'test 003 - batched query: SELECT....; SELECT (with no results) ....; SELECT....;';
    test(testname, function (done) {
        var testcolumnsize = 100;
        var testcolumntype = " varchar(" + testcolumnsize + ")";
        var testcolumnclienttype = "text";
        var testcolumnsqltype = "varchar";
        var testcolumnname = "col2";
        var testdata1 = null;
        var testdata2Expected = "string data row 2";
        var testdata2TsqlInsert = "'" + testdata2Expected + "'";
        var tsql = "SELECT * FROM " + tablename + " ORDER BY id;  SELECT * FROM " + tablename + " WHERE 1=2; SELECT * FROM " + tablename + " ORDER BY id;";

        var expected1 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                [[1, null],
                    [2, testdata2Expected]]
        };

        var expected2 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                []
        };

        var fns = [

            function (async_done) {
                commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, function() {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, function () {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, function () {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.compoundQueryTSQL(theConnection, tsql, expected1, expected2, expected1, testname, function () {
                    async_done();
                });
            }
        ];

        async.series(fns, function () {
            done();
        });  // end of async.series()
    }); // end of test()

    testname = 'test 004 - batched query: SELECT....; INSERT (invalid...should fail) ....; SELECT....;';
    test(testname, function (done) {
        var invalidtablename = "invalid" + tablename;
        var testcolumnsize = 100;
        var testcolumntype = " varchar(" + testcolumnsize + ")";
        var testcolumnclienttype = "text";
        var testcolumnsqltype = "varchar";
        var testcolumnname = "col2";
        var testdata1 = null;
        var testdata2Expected = "string data row 2";
        var testdata2TsqlInsert = "'" + testdata2Expected + "'";
        var tsql = "SELECT * FROM " + tablename + " ORDER BY id;  INSERT INTO " + invalidtablename + " (" + testcolumnname + ") VALUES (" + testdata1 + ");SELECT * FROM " + tablename + " ORDER BY id;";

        var expected1 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                [[1, null],
                    [2, testdata2Expected]]
        };

        var expected2 = {
            meta:
                [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
                    { name: testcolumnname, size: testcolumnsize, nullable: true, type: testcolumnclienttype, sqlType: testcolumnsqltype }],
            rows:
                []
        };
        var expectedError = new Error( "[Microsoft][" + config.driver + "][SQL Server]Invalid object name '" + invalidtablename + "'." );
        expectedError.sqlstate = '42S02';
        expectedError.code = 208;

        var fns =
        [
            function (async_done) {
                commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, function() {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, function () {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, function () {
                    async_done();
                });
            },
            function (async_done) {
                commonTestFns.invalidQueryTSQL(theConnection, tsql, expectedError, testname, function () {
                    async_done();
                });
            }
        ];

        async.series(fns, function () {
            done();
        });  // end of async.series()
    }); // end of test()
});