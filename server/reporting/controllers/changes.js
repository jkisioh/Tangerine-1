/**
 * This file implements couch DB changes features.
 * It watches for any changes in the database and
 * processes the changed document based on its collection type.
 */

/**
 * Module Dependencies.
 */

const _ = require('lodash');
const PouchDB = require('pouchdb');

/**
 * Local dependencies.
 */

const dbConfig = require('./../config');
const dbQuery = require('./../utils/dbQuery');
const generateAssessmentHeaders = require('./assessment').createColumnHeaders;
const processAssessmentResult = require('./result').generateResult;
const generateWorkflowHeaders = require('./workflow').createWorkflowHeaders;
const processWorkflowResult = require('./trip').processWorkflowResult;

// Initialize database
const GROUP_DB = new PouchDB(dbConfig.base_db);
const RESULT_DB = new PouchDB(dbConfig.result_db);

/**
 * Processes any recently changed document in the database based on its collection type.
 *
 * Example:
 *
 *    POST /tangerine_changes
 *
 *  The request object must contain the database url and the result database url.
 *       {
 *         "db_url": "http://admin:password@test.tangerine.org/database_name"
 *         "another_db_url": "http://admin:password@test.tangerine.org/result_database_name"
 *       }
 *
 * Response:
 *
 * Returns the changed document in the database.
 *      {
 *        "seq": 1001,
 *        "id": "e1234567890",
 *        "changes": [
 *            {
 *              "rev": "1-123a"
 *            }
 *        ]
 *      }
 *
 * @param req - HTTP request object
 * @param res - HTTP response object
 */

exports.changes = async(req, res) => {
  GROUP_DB.changes({ since: 'now', include_docs: true })
    .on('change', (body) => {
      processChangedDocument(body);
      res.json(body);
    })
    .on('error', (err) => console.error(err));
}

const processChangedDocument = async(resp) => {
  const assessmentId = resp.doc.assessmentId;
  const workflowId = resp.doc.workflowId;
  const collectionType = resp.doc.collection;

  const isWorkflowIdSet = (workflowId) ? true : false;
  const isResult = (collectionType === 'result') ? true : false;
  const isWorkflow = (collectionType === 'workflow') ? true : false;
  const isAssessment = (collectionType === 'assessment') ? true : false;
  const isCurriculum = (collectionType === 'curriculum') ? true : false;
  const isQuestion = (collectionType === 'question') ? true : false;
  const isSubtest = (collectionType === 'subtest') ? true : false;

  if (isWorkflowIdSet && isResult) {
    console.info('\n<<<=== START PROCESSING WORKFLOW RESULT ===>>>\n');
    let totalResult = {};
    try {
      let data = await dbQuery.getTripResults(resp.doc.tripId)
      const workflowResult = await processWorkflowResult(data);
      workflowResult.forEach(element => totalResult = Object.assign(totalResult, element));
      const saveResponse = await dbQuery.saveResult(totalResult);
      console.log(saveResponse);
      console.info('\n<<<=== END PROCESSING WORKFLOW RESULT ===>>>\n');
    } catch (error) {
      console.error(error);
    }
  }

  if (!isWorkflowIdSet && isResult) {
    try {
      console.info('\n<<<=== START PROCESSING ASSESSMENT RESULT  ===>>>\n');
      const assessmentResult = await processAssessmentResult([resp]);
      const saveResponse = await dbQuery.saveResult(assessmentResult);
      console.log(saveResponse);
      console.info('\n<<<=== END PROCESSING ASSESSMENT RESULT ===>>>\n');
    } catch (err) {
      console.error(err);
    }
  }

  if (isWorkflow) {
    try {
      console.info('\n<<<=== START PROCESSING WORKFLOW COLLECTION  ===>>>\n');
      const workflowHeaders = await generateWorkflowHeaders(resp.doc);
      const saveResponse = await dbQuery.saveHeaders(workflowHeaders, workflowId);
      console.log(saveResponse);
      console.info('\n<<<=== END PROCESSING WORKFLOW COLLECTION ===>>>\n');
    } catch (err) {
      console.error(err);
    }
  }

  if (isAssessment || isCurriculum || isQuestion || isSubtest) {
    try {
      console.info('\n<<<=== START PROCESSING ASSESSMENT or CURRICULUM or SUBTEST or QUESTION COLLECTION  ===>>>\n');
      const assessmentHeaders = await generateAssessmentHeaders(assessmentId);
      const saveResponse = await dbQuery.saveHeaders(assessmentHeaders, assessmentId);
      console.log(saveResponse);
      // await dbQuery.saveUpdateSequence(resultDbUrl, seqDoc);
      console.info('\n<<<=== END PROCESSING ASSESSMENT or CURRICULUM or SUBTEST or QUESTION COLLECTION ===>>>\n');
    } catch (err) {
      console.error(err);
    }
  }

}

exports.processChangedDocument = processChangedDocument;