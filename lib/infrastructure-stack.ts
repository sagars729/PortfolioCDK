import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as targets from "@aws-cdk/aws-route53-targets";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a bucket with public read access     
    const myBucket = new s3.Bucket(this, "sagardsaxena.com", {
      bucketName: "sagardsaxena.com",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html"
    });

    // Lookup an existing zone
    const zone = route53.HostedZone.fromLookup(this, 'baseZone', {
      domainName: 'sagardsaxena.com'
    });

    // Create a new certificate for domain name
    const cert = new acm.Certificate(this, 'Certificate', {
        domainName: 'www.sagardsaxena.com',
        validation: acm.CertificateValidation.fromDns(zone)
    });

    // Create a new certificate for second domain name
    // const cert2 = new acm.Certificate(this, 'Certificate2', {
    //     domainName: 'sagardsaxena.com',
    //     validation: acm.CertificateValidation.fromDns(zone)
    // });

    // Create a CloudFront Distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "Distribution",
      {
        viewerCertificate: {
          aliases: ["www.sagardsaxena.com"],
          props: {
            acmCertificateArn: cert.certificateArn,
            sslSupportMethod: "sni-only",
          },
        },
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: myBucket,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ]
    });

    // Register the subdomain
    const cName = new route53.CnameRecord(this, 'test.baseZone', {
        zone: zone,
        recordName: 'www',
        domainName: distribution.domainName
    });

    // Register the blank subdomain
    // const aRec = new route53.ARecord(this, 'test.baseZone2', {
    //     zone: zone,
    //     target: new route53.RecordTarget(distribution.domainName)
    // });

    // Deploy the Local Website to S3
    const deployment = new s3Deployment.BucketDeployment(this,
    "deployStaticWebsite", {
      sources: [s3Deployment.Source.asset("../website/build"),s3Deployment.Source.asset("../website/assets")],
      destinationBucket: myBucket,
      distribution: distribution
    });

    // Output the CloudFront Domain Name
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.domainName,
    });
  }
}
