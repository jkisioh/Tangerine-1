/**
 * This file is a collection of helper functions for database queries.
*/

/**
 * Module dependencies.
 */

const _ = require('lodash');
const nano = require('nano');
const PouchDB = require('pouchdb');

/**
 * Local dependency.
 */

const dbConfig = require('./../config');

// Initialize database
const GROUP_DB = new PouchDB(dbConfig.base_db);
const RESULT_DB = new PouchDB(dbConfig.result_db);

/**
 * This function retrieves all curriculum collections in the database.
 *
 * @param {string} dbUrl - database url.
 *
 * @returns {Array} – all curriculum documents.
 */

exports.getAllCurriculum = (dbUrl) => {
  const BASE_DB = nano(dbUrl);
  return new Promise((resolve, reject) => {
    BASE_DB.view('ojai', 'byCollection', {
      key: 'curriculum',
      include_docs: true
    }, (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body.rows);
      }
    });
  });
}

/**
 * This function retrieves all workflow collections in the database.
 *
 * @param {string} dbUrl - database url.
 *
 * @returns {Array} – all workflow documents.
 */

exports.getAllWorkflow = (dbUrl) => {
  const BASE_DB = nano(dbUrl);
  return new Promise((resolve, reject) => {
    BASE_DB.view('ojai', 'byCollection', {
      key: 'workflow',
      include_docs: true
    }, (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body.rows);
      }
    });
  });
}

/**
 * This function retrieves all result collections in the database.
 *
 * @param {string} dbUrl - database url.
 *
 * @returns {Array} – all result documents.
 */

exports.getAllResult = (dbUrl) => {
  const BASE_DB = nano(dbUrl);
  return new Promise((resolve, reject) => {
    BASE_DB.view('ojai', 'csvRows', {
      include_docs: true
    }, (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        let resultCollection = _.map(body.rows, (data) => data.doc);
        resolve(resultCollection);
      }
    });
  });
}

/**
 * This function retrieves a document from the database.
 *
 * @param {string} docId - id of document.
 * @param {string} dbUrl - database url.
 *
 * @returns {Object} - retrieved document.
 */

exports.retrieveDoc = (docId, dbUrl) => {
  const DB = nano(dbUrl);
  return new Promise ((resolve, reject) => {
    DB.get(docId, (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body);
      }
    });
  });
}

/**
 * This function saves/updates generated headers in the result database.
 *
 * @param {Array} doc - document to be saved.
 * @param {string} key - key for indexing.
 *
 * @returns {Object} - saved document.
 */

exports.saveHeaders = async (doc, key) => {
  let existingDoc = await RESULT_DB.get(key);
  let docObj = { column_headers: doc };
  docObj.updated_at = new Date().toISOString();
  if(!existingDoc.status) {
    docObj = _.assignIn(existingDoc, docObj);
  }
  try {
    let response = await RESULT_DB.put(docObj);
    return response;
  } catch(err) {
    console.log(err);
  }
}

/**
 * This function saves/updates processed result in the result database.
 *
 * @param {Object} doc - document to be saved.
 * @param {string} key - key for indexing.
 * @param {string} dbUrl - url of the result database.
 *
 * @returns {Object} - saved document.
 */

exports.saveResult = (doc, dbUrl) => {
  const RESULT_DB = nano(dbUrl);
  const cloneDoc = _.clone(doc);
  let docKey = cloneDoc.indexKeys.ref;
  delete doc.indexKeys;

  let docObj = {
    updated_at: new Date().toISOString(),
    parent_id: cloneDoc.indexKeys.parent_id,
    result_time : cloneDoc.indexKeys.time,
    result_day : cloneDoc.indexKeys.day,
    result_month: cloneDoc.indexKeys.month,
    result_year: cloneDoc.indexKeys.year,
    processed_results: doc
  };

  return new Promise((resolve, reject) => {
    RESULT_DB.get(docKey, (error, existingDoc) => {
      // if doc exists update it using its revision number.
      if (!error) {
        docObj = _.assignIn(existingDoc, docObj);
      }
      RESULT_DB.insert(docObj, docKey, (err, body) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(body);
        }
      });
    });
  });
}

/**
 * This function retrieves all subtest linked to an assessment.
 *
 * @param {string} id - id of assessment document.
 * @param {string} dbUrl - database url.
 *
 * @returns {Array} - subtest documents.
 */

exports.getSubtests = (id) => {
  return new Promise((resolve, reject) => {
    GROUP_DB.query('ojai/subtestsByAssessmentId', { key: id, include_docs: true })
      .then((body) => {
        if (body && body.rows) {
          let subtestDoc = _.map(body.rows, (data) => data.doc);
          let orderedSubtests = _.sortBy(subtestDoc, ['assessmentId', 'order']);
          resolve(orderedSubtests);
        }
        resolve(body);
      }).catch((err) => reject(err));
  });
}

/**
 * This function retrieves all questions linked to a subtest document.
 *
 * @param {string} subtestId - id of subtest document.
 * @param {string} dbUrl - database url.
 *
 * @returns {Array} - question documents.
 */

exports.getQuestionBySubtestId = (subtestId) => {
  return new Promise((resolve, reject) => {
    GROUP_DB.query('ojai/questionsByParentId',{ key: subtestId, include_docs: true })
      .then((body) => {
        let doc = _.map(body.rows, (data) => data.doc);
        resolve(doc);
      }).catch((err) => reject(err));
  });
}

/**
 * This function retrieves all processed result for a given document id
 *
 * @param {string} ref - id of document.
 *
 * @returns {Array} - result documents.
 */

exports.getProcessedResults = function (ref) {
  return new Promise((resolve, reject) => {
    RESULT_DB.query('dashReporting/byParentId', { key: ref, include_docs: true })
      .then((body) => resolve(body.rows))
      .catch((err) => reject(err));
  });
}

/**
 * This function retrieves a result document.
 *
 * @param {string} id - trip id of document.
 *
 * @returns {Array} - result documents.
 */

exports.getResults = function(id) {
  return new Promise((resolve, reject) => {
    GROUP_DB.query('dashReporting/byTripId', {
      key: id,
      include_docs: true
    }, (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body.rows);
      }
    });
  });
}

exports.checkUpdateSequence = (dbUrl) => {
  const DB = nano(dbUrl);
  return new Promise((resolve, reject) => {
    DB.get('last_update_sequence', (err, obj) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(obj);
      }
    });
  });
};

exports.saveUpdateSequence = (dbUrl, doc) => {
  const DB = nano(dbUrl)
  return new Promise((resolve, reject) => {
    DB.get(doc.key, (error, seqDoc) => {
      if (!error) {
        doc._rev = seqDoc._rev;
      }
      DB.insert(doc, doc.key, (err, body) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(body);
        }
      });
    });
  });
};

exports.processedResultsById = function (req, res) {
  RESULT_DB.query('dashReporting/byParentId', {
    key: req.params.id,
    include_docs: true
  }, (err, body) => {
    if (err) {
      res.send(err);
    }
    else {
      res.json(body.rows);
    }
  });
}


/**
 * @description – This function retrieves enumerator information.
 *
 * @param {string} enumerator - name of the enumerator.
 *
 * @returns {Object} - user document.
 */

exports.getUserDetails = function (enumerator, dbUrl) {
  return new Promise((resolve, reject) => {
    GROUP_DB.get(enumerator, (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body);
      }
    });
  });
}

/**
 * @description – This function retrieves location list
 *
 * @returns {Object} - location document.
 */

exports.getLocationList = function () {
  return new Promise((resolve, reject) => {
    GROUP_DB.get('location-list', (err, body) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(body);
      }
    });
  });
}

exports.getSettings = function () {
  return new Promise((resolve, reject) => {
    GROUP_DB.get('settings', (err, body) => {
      if(err)
        reject(err)
      else
        resolve(body);
    });
  });
}
