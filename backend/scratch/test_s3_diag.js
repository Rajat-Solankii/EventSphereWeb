require('dotenv').config();
const { S3Client, HeadBucketCommand, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

(async () => {
  console.log('=== S3 Diagnostic Report ===\n');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Bucket:', process.env.AWS_S3_BUCKET_NAME);
  console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
  console.log('');

  // Step 1
  try {
    console.log('[1] Testing AWS Credentials (ListBuckets)...');
    const buckets = await client.send(new ListBucketsCommand({}));
    console.log('    OK - Credentials are VALID');
    console.log('    Available buckets:', buckets.Buckets?.map(b => b.Name).join(', ') || 'none');
    console.log('');
  } catch (err) {
    console.error('    FAIL -', err.name, '-', err.message);
    process.exit(1);
  }

  // Step 2
  try {
    console.log('[2] Testing Bucket Access...');
    await client.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME }));
    console.log('    OK - Bucket exists');
    console.log('');
  } catch (err) {
    console.error('    FAIL -', err.name, '-', err.message);
    if (err.$metadata) console.error('    HTTP Status:', err.$metadata.httpStatusCode);
    process.exit(1);
  }

  // Step 3
  try {
    console.log('[3] Testing Upload...');
    const testKey = '_test/diagnostic-' + Date.now() + '.txt';
    await client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: testKey,
      Body: 'EventSphere test',
      ContentType: 'text/plain'
    }));
    const url = 'https://' + process.env.AWS_S3_BUCKET_NAME + '.s3.' + process.env.AWS_REGION + '.amazonaws.com/' + testKey;
    console.log('    OK - Upload worked');
    console.log('    URL:', url);
    console.log('');
  } catch (err) {
    console.error('    FAIL -', err.name, '-', err.message);
    process.exit(1);
  }

  // Step 4
  try {
    console.log('[4] Testing Public Read...');
    const testKey = '_test/pub-' + Date.now() + '.txt';
    await client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: testKey,
      Body: 'public test',
      ContentType: 'text/plain'
    }));
    const url = 'https://' + process.env.AWS_S3_BUCKET_NAME + '.s3.' + process.env.AWS_REGION + '.amazonaws.com/' + testKey;
    const resp = await fetch(url);
    if (resp.ok) {
      console.log('    OK - Objects are publicly readable');
    } else {
      console.log('    WARN - Objects NOT publicly readable (HTTP ' + resp.status + ')');
      console.log('    Need bucket policy for public read.');
    }
  } catch (err) {
    console.error('    WARN - ' + err.message);
  }

  console.log('\n=== Done ===');
})();
