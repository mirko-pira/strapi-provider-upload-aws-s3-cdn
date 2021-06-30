'use strict'
// https://strapi.io/documentation/v3.x/plugins/upload.html#create-providers
// Copy of strapi-provider-upload-aws-s3 but uses cdn (i.e. cloudfront)
// https://github.com/strapi/strapi/tree/master/packages/strapi-provider-upload-aws-s3
/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const _ = require('lodash')
const AWS = require('aws-sdk')

module.exports = {
  init(config) {
    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    })

    function getConfig(file, source = true){
      if(file.name.startsWith('vod_') && file.mime.startsWith('video')){
        config.params.Bucket = source ? config.vod.source_bucket : config.vod.destination_bucket;
        config.cdn = config.vod.cdn;
      }
      if(file.name.startsWith('aod_') && file.mime.startsWith('audio')){
        config.params.Bucket = source ? config.aod.source_bucket : config.aod.destination_bucket;
        config.cdn = config.aod.cdn;
      }
      return config;
    }

    return {
      upload(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          let myConfig = getConfig(file);
          let fS3 = new AWS.S3({apiVersion: '2006-03-01', ...myConfig });

          // upload file on S3 bucket
          const path = file.path ? `${file.path}/` : ''

          fS3.upload(
            {
              Key: `${path}${file.hash}${file.ext}`,
              Body: Buffer.from(file.buffer, 'binary'),
              ACL: 'public-read',
              ContentType: file.mime,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err)
              }

              // set the bucket file url
              if (config.cdn) {
                file.url = data.Location
                file.urlCdn = `${config.cdn}${data.Key}`
              } else {
                file.url = data.Location
              }

              resolve()
            }
          )
        })
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          let myConfig = getConfig(file, false);
          let fS3 = new AWS.S3({apiVersion: '2006-03-01', ...myConfig });

          // delete file on S3 bucket
          const path = file.path ? `${file.path}/` : ''

          fS3.deleteObject(
            {
              Key: `${path}${file.hash}${file.ext}`,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err)
              }

              resolve()
            }
          )
        })
      },
    }
  },
}
