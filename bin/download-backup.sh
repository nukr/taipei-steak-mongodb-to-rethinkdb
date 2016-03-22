#!/bin/bash

aws s3 cp s3://accountant-backup/$(aws s3 ls s3://accountant-backup | awk '{print $4}' | tail -n 1) $1
