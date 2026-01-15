-- Migration: Populate default templates for all existing businesses
-- This creates the 4 application templates and 4 agreement templates for each business

DO $$
DECLARE
    v_business RECORD;
    v_app_count INT;
    v_agr_count INT;
BEGIN
    -- Loop through all active businesses
    FOR v_business IN
        SELECT id, owner_user_id
        FROM businesses
        WHERE is_active = true
    LOOP
        -- Check if business already has application templates
        SELECT COUNT(*) INTO v_app_count
        FROM application_templates
        WHERE business_id = v_business.id;

        -- Create application templates if none exist
        IF v_app_count = 0 THEN
            -- Standard Rental Application
            INSERT INTO application_templates (
                business_id, created_by, template_name, description, application_type,
                form_schema, require_income_verification, require_employment_verification,
                require_rental_history, require_references, require_id_verification,
                require_credit_check_consent, require_background_check_consent,
                minimum_income_ratio, terms_and_conditions, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Standard Rental Application',
                'Comprehensive application for long-term residential rentals. Includes employment verification, rental history, references, and background screening consent.',
                'standard',
                '{"sections":[{"id":"personal_info","title":"Personal Information","description":"Please provide your basic contact information","fields":[{"id":"first_name","type":"text","label":"First Name","required":true},{"id":"last_name","type":"text","label":"Last Name","required":true},{"id":"email","type":"email","label":"Email Address","required":true},{"id":"phone","type":"tel","label":"Phone Number","required":true},{"id":"date_of_birth","type":"date","label":"Date of Birth","required":true}]},{"id":"employment","title":"Employment Information","description":"Tell us about your current employment","fields":[{"id":"employment_status","type":"select","label":"Employment Status","required":true,"options":["Employed Full-Time","Employed Part-Time","Self-Employed","Retired","Student","Unemployed"]},{"id":"employer","type":"text","label":"Current Employer","required":false},{"id":"job_title","type":"text","label":"Job Title","required":false},{"id":"monthly_income","type":"number","label":"Monthly Income ($)","required":true}]},{"id":"rental_history","title":"Rental History","description":"Please provide your current and previous rental information","fields":[{"id":"current_address","type":"textarea","label":"Current Address","required":true},{"id":"current_landlord_name","type":"text","label":"Current Landlord Name","required":false},{"id":"current_landlord_phone","type":"tel","label":"Current Landlord Phone","required":false},{"id":"time_at_current_address","type":"text","label":"Time at Current Address","required":true},{"id":"reason_for_moving","type":"textarea","label":"Reason for Moving","required":true}]},{"id":"move_in_details","title":"Move-In Details","description":"Tell us about your intended move","fields":[{"id":"desired_move_in_date","type":"date","label":"Desired Move-In Date","required":true},{"id":"lease_term","type":"select","label":"Preferred Lease Term","required":true,"options":["6 months","12 months","18 months","24 months","Month-to-month"]},{"id":"num_occupants","type":"number","label":"Total Number of Occupants","required":true}]},{"id":"emergency_contact","title":"Emergency Contact","description":"Please provide an emergency contact","fields":[{"id":"emergency_contact_name","type":"text","label":"Emergency Contact Name","required":true},{"id":"emergency_contact_phone","type":"tel","label":"Emergency Contact Phone","required":true},{"id":"emergency_contact_relationship","type":"text","label":"Relationship","required":true}]}]}'::jsonb,
                true, true, true, true, false, true, true, 3.0,
                'By submitting this application, I certify that all information provided is true and complete to the best of my knowledge. I authorize the landlord or property manager to verify any and all information provided, including but not limited to employment, rental history, and credit history.',
                true, true, 1
            );

            -- Short-Term/Vacation Rental
            INSERT INTO application_templates (
                business_id, created_by, template_name, description, application_type,
                form_schema, require_income_verification, require_employment_verification,
                require_rental_history, require_references, require_id_verification,
                require_credit_check_consent, require_background_check_consent,
                minimum_income_ratio, terms_and_conditions, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Short-Term/Vacation Rental',
                'Streamlined application for vacation rentals, Airbnb-style stays, and short-term guests. Focuses on guest details and house rules acknowledgment.',
                'short-term',
                '{"sections":[{"id":"personal_info","title":"Guest Information","description":"Please provide your contact information","fields":[{"id":"first_name","type":"text","label":"First Name","required":true},{"id":"last_name","type":"text","label":"Last Name","required":true},{"id":"email","type":"email","label":"Email Address","required":true},{"id":"phone","type":"tel","label":"Phone Number","required":true},{"id":"date_of_birth","type":"date","label":"Date of Birth","required":true}]},{"id":"stay_details","title":"Stay Details","description":"Tell us about your planned stay","fields":[{"id":"check_in_date","type":"date","label":"Check-In Date","required":true},{"id":"check_out_date","type":"date","label":"Check-Out Date","required":true},{"id":"num_guests","type":"number","label":"Number of Guests","required":true},{"id":"purpose_of_stay","type":"select","label":"Purpose of Stay","required":true,"options":["Vacation","Business","Family Visit","Event/Wedding","Other"]}]},{"id":"emergency_contact","title":"Emergency Contact","description":"Please provide an emergency contact","fields":[{"id":"emergency_contact_name","type":"text","label":"Emergency Contact Name","required":true},{"id":"emergency_contact_phone","type":"tel","label":"Emergency Contact Phone","required":true},{"id":"emergency_contact_relationship","type":"text","label":"Relationship","required":true}]}]}'::jsonb,
                false, false, false, false, true, false, false, 0,
                'By submitting this booking request, I agree to abide by all house rules and policies. I understand I am responsible for any damages caused during my stay.',
                true, false, 1
            );

            -- Student Housing Application
            INSERT INTO application_templates (
                business_id, created_by, template_name, description, application_type,
                form_schema, require_income_verification, require_employment_verification,
                require_rental_history, require_references, require_id_verification,
                require_credit_check_consent, require_background_check_consent,
                minimum_income_ratio, terms_and_conditions, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Student Housing Application',
                'Designed for student rentals near universities and colleges. Includes academic information and guarantor/co-signer section for students without income.',
                'student',
                '{"sections":[{"id":"personal_info","title":"Student Information","description":"Please provide your basic information","fields":[{"id":"first_name","type":"text","label":"First Name","required":true},{"id":"last_name","type":"text","label":"Last Name","required":true},{"id":"email","type":"email","label":"Email Address","required":true},{"id":"phone","type":"tel","label":"Phone Number","required":true},{"id":"date_of_birth","type":"date","label":"Date of Birth","required":true},{"id":"student_id","type":"text","label":"Student ID Number","required":true}]},{"id":"academic_info","title":"Academic Information","description":"Tell us about your studies","fields":[{"id":"school_name","type":"text","label":"School/University Name","required":true},{"id":"enrollment_status","type":"select","label":"Enrollment Status","required":true,"options":["Full-Time","Part-Time","Graduate","PhD Candidate"]},{"id":"year_of_study","type":"select","label":"Year of Study","required":true,"options":["1st Year","2nd Year","3rd Year","4th Year","5th Year+","Graduate","Post-Graduate"]},{"id":"major_field","type":"text","label":"Major/Field of Study","required":true},{"id":"expected_graduation","type":"date","label":"Expected Graduation Date","required":true}]},{"id":"guarantor_info","title":"Guarantor/Co-Signer Information","description":"Parent or guardian who will guarantee the lease","fields":[{"id":"guarantor_name","type":"text","label":"Guarantor Full Name","required":true},{"id":"guarantor_relationship","type":"text","label":"Relationship to Applicant","required":true},{"id":"guarantor_email","type":"email","label":"Guarantor Email","required":true},{"id":"guarantor_phone","type":"tel","label":"Guarantor Phone","required":true},{"id":"guarantor_address","type":"textarea","label":"Guarantor Address","required":true}]},{"id":"emergency_contact","title":"Emergency Contact","description":"Please provide an emergency contact","fields":[{"id":"emergency_contact_name","type":"text","label":"Emergency Contact Name","required":true},{"id":"emergency_contact_phone","type":"tel","label":"Emergency Contact Phone","required":true},{"id":"emergency_contact_relationship","type":"text","label":"Relationship","required":true}]}]}'::jsonb,
                false, false, false, false, true, true, true, 0,
                'By submitting this application, I certify that all information provided is true and complete to the best of my knowledge. A guarantor/co-signer may be required to complete a separate application.',
                true, false, 1
            );

            -- Corporate/Professional Relocation
            INSERT INTO application_templates (
                business_id, created_by, template_name, description, application_type,
                form_schema, require_income_verification, require_employment_verification,
                require_rental_history, require_references, require_id_verification,
                require_credit_check_consent, require_background_check_consent,
                minimum_income_ratio, terms_and_conditions, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Corporate/Professional Relocation',
                'Application for corporate tenants, professional relocations, and employer-sponsored housing. Includes company verification and HR contact information.',
                'corporate',
                '{"sections":[{"id":"personal_info","title":"Applicant Information","description":"Please provide your contact information","fields":[{"id":"first_name","type":"text","label":"First Name","required":true},{"id":"last_name","type":"text","label":"Last Name","required":true},{"id":"email","type":"email","label":"Email Address","required":true},{"id":"phone","type":"tel","label":"Phone Number","required":true},{"id":"date_of_birth","type":"date","label":"Date of Birth","required":true}]},{"id":"company_info","title":"Company/Corporate Information","description":"Details about the sponsoring company","fields":[{"id":"company_name","type":"text","label":"Company Name","required":true},{"id":"company_address","type":"textarea","label":"Company Address","required":true},{"id":"hr_contact_name","type":"text","label":"HR/Admin Contact Name","required":true},{"id":"hr_contact_email","type":"email","label":"HR/Admin Contact Email","required":true},{"id":"hr_contact_phone","type":"tel","label":"HR/Admin Contact Phone","required":true}]},{"id":"employment","title":"Employment Details","description":"Your position and income information","fields":[{"id":"job_title","type":"text","label":"Job Title","required":true},{"id":"department","type":"text","label":"Department","required":false},{"id":"employment_start_date","type":"date","label":"Employment Start Date","required":true},{"id":"employment_type","type":"select","label":"Employment Type","required":true,"options":["Permanent","Contract","Temporary Assignment","Relocation"]},{"id":"annual_salary","type":"number","label":"Annual Salary ($)","required":true}]},{"id":"emergency_contact","title":"Emergency Contact","description":"Please provide an emergency contact","fields":[{"id":"emergency_contact_name","type":"text","label":"Emergency Contact Name","required":true},{"id":"emergency_contact_phone","type":"tel","label":"Emergency Contact Phone","required":true},{"id":"emergency_contact_relationship","type":"text","label":"Relationship","required":true}]}]}'::jsonb,
                true, true, true, false, true, true, true, 2.5,
                'By submitting this application, I certify that all information provided is true and complete to the best of my knowledge. I authorize the landlord or property manager to verify any and all information provided.',
                true, false, 1
            );

            RAISE NOTICE 'Created 4 application templates for business %', v_business.id;
        END IF;

        -- Check if business already has agreement templates
        SELECT COUNT(*) INTO v_agr_count
        FROM agreement_templates
        WHERE business_id = v_business.id;

        -- Create agreement templates if none exist
        IF v_agr_count = 0 THEN
            -- Standard 12-Month Lease
            INSERT INTO agreement_templates (
                business_id, created_by, template_name, description, agreement_type,
                agreement_title, template_content, default_lease_term_months,
                payment_frequency, pet_policy, house_rules, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Standard 12-Month Lease',
                'Traditional residential lease agreement for 12-month tenancies. Covers all standard terms including rent, security deposit, maintenance, and house rules.',
                'lease',
                'Residential Lease Agreement',
                E'RESIDENTIAL LEASE AGREEMENT\n\nThis Residential Lease Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:\n\nLANDLORD:\n{{LANDLORD_NAME}}\n{{LANDLORD_EMAIL}}\n{{LANDLORD_PHONE}}\n\nTENANT:\n{{TENANT_NAME}}\n{{TENANT_EMAIL}}\n{{TENANT_PHONE}}\n\nPROPERTY:\n{{PROPERTY_ADDRESS}}\nUnit: {{UNIT_NUMBER}}\n\n1. LEASE TERM\nThis lease shall commence on {{LEASE_START_DATE}} and shall terminate on {{LEASE_END_DATE}}, unless renewed or terminated earlier in accordance with this Agreement.\n\n2. RENT\nMonthly Rent: {{MONTHLY_RENT}}\nPayment Due: On the {{PAYMENT_DUE_DAY}} day of each month\n\n3. SECURITY DEPOSIT\nSecurity Deposit Amount: {{SECURITY_DEPOSIT}}\nThe security deposit will be held by the Landlord and returned within the time period required by law after the termination of this lease.\n\n4. LATE FEES\nIf rent is not received by the {{LATE_FEE_GRACE_DAYS}} day of the month, a late fee of {{LATE_FEE_AMOUNT}} will be charged.\n\n5. UTILITIES\nThe following utilities are included in the rent: {{UTILITIES_INCLUDED}}\n\n6. OCCUPANTS\nMaximum occupancy: {{MAX_OCCUPANTS}} persons.\n\n7. PETS\n{{PET_POLICY}}\n\n8. HOUSE RULES\n{{HOUSE_RULES}}\n\n9. MAINTENANCE AND REPAIRS\nTenant shall maintain the premises in a clean and sanitary condition.\n\n10. TERMINATION\nEither party may terminate this Agreement by providing written notice as required by law.\n\nSIGNATURES\n\nLandlord Signature: _________________________ Date: _____________\n\nTenant Signature: _________________________ Date: _____________',
                12, 'monthly',
                'No pets allowed without prior written approval. If pets are approved, a pet deposit may be required.',
                'Tenant agrees to maintain the premises in good condition, dispose of garbage properly, not disturb neighbors, and comply with all applicable laws and regulations.',
                true, true, 1
            );

            -- Month-to-Month Agreement
            INSERT INTO agreement_templates (
                business_id, created_by, template_name, description, agreement_type,
                agreement_title, template_content, default_lease_term_months,
                payment_frequency, pet_policy, house_rules, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Month-to-Month Agreement',
                'Flexible rental agreement that renews monthly. Either party can terminate with 30 days notice. Ideal for tenants needing flexibility.',
                'month-to-month',
                'Month-to-Month Rental Agreement',
                E'MONTH-TO-MONTH RENTAL AGREEMENT\n\nThis Month-to-Month Rental Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:\n\nLANDLORD:\n{{LANDLORD_NAME}}\n{{LANDLORD_EMAIL}}\n{{LANDLORD_PHONE}}\n\nTENANT:\n{{TENANT_NAME}}\n{{TENANT_EMAIL}}\n{{TENANT_PHONE}}\n\nPROPERTY:\n{{PROPERTY_ADDRESS}}\nUnit: {{UNIT_NUMBER}}\n\n1. RENTAL TERM\nThis is a month-to-month tenancy beginning on {{LEASE_START_DATE}}. Either party may terminate this Agreement by providing 30 days written notice prior to the end of any rental period.\n\n2. RENT\nMonthly Rent: {{MONTHLY_RENT}}\nPayment Due: On the {{PAYMENT_DUE_DAY}} day of each month\n\n3. SECURITY DEPOSIT\nSecurity Deposit Amount: {{SECURITY_DEPOSIT}}\n\n4. LATE FEES\nLate fee of {{LATE_FEE_AMOUNT}} if rent is not received by the {{LATE_FEE_GRACE_DAYS}} day of the month.\n\n5. UTILITIES\nIncluded: {{UTILITIES_INCLUDED}}\n\n6. OCCUPANTS\nMaximum occupancy: {{MAX_OCCUPANTS}} persons.\n\n7. PETS\n{{PET_POLICY}}\n\n8. HOUSE RULES\n{{HOUSE_RULES}}\n\n9. NOTICE TO TERMINATE\nEither party must provide at least 30 days written notice before the end of any monthly period to terminate this Agreement.\n\nSIGNATURES\n\nLandlord Signature: _________________________ Date: _____________\n\nTenant Signature: _________________________ Date: _____________',
                1, 'monthly',
                'Pets subject to approval. Pet rent may apply.',
                'Standard residential rules apply. Quiet hours 10pm-8am. No illegal activities.',
                true, false, 1
            );

            -- Short-Term Rental Agreement
            INSERT INTO agreement_templates (
                business_id, created_by, template_name, description, agreement_type,
                agreement_title, template_content, default_lease_term_months,
                payment_frequency, pet_policy, house_rules, cancellation_policy, refund_policy,
                is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Short-Term Rental Agreement',
                'Agreement for vacation rentals, furnished short-stays, and temporary housing. Includes check-in/out times and cancellation policy.',
                'short-term',
                'Short-Term Rental Agreement',
                E'SHORT-TERM RENTAL AGREEMENT\n\nThis Short-Term Rental Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:\n\nPROPERTY OWNER/HOST:\n{{LANDLORD_NAME}}\n{{LANDLORD_EMAIL}}\n{{LANDLORD_PHONE}}\n\nGUEST:\n{{TENANT_NAME}}\n{{TENANT_EMAIL}}\n{{TENANT_PHONE}}\n\nPROPERTY:\n{{PROPERTY_ADDRESS}}\nUnit: {{UNIT_NUMBER}}\n\n1. RENTAL PERIOD\nCheck-In Date: {{LEASE_START_DATE}}\nCheck-Out Date: {{LEASE_END_DATE}}\nCheck-In Time: 3:00 PM\nCheck-Out Time: 11:00 AM\n\n2. RENTAL RATE\nTotal Rental Amount: {{MONTHLY_RENT}}\nPayment is due in full prior to check-in.\n\n3. SECURITY/DAMAGE DEPOSIT\nDamage Deposit: {{SECURITY_DEPOSIT}}\nThe damage deposit will be refunded within 7 days after check-out, less any deductions for damages.\n\n4. MAXIMUM OCCUPANCY\nMaximum guests allowed: {{MAX_OCCUPANTS}}\n\n5. CANCELLATION POLICY\n{{CANCELLATION_POLICY}}\n\n6. HOUSE RULES\n{{HOUSE_RULES}}\n\n- No smoking on the premises\n- No parties or events without prior approval\n- Quiet hours: 10:00 PM - 8:00 AM\n\n7. PETS\n{{PET_POLICY}}\n\n8. DAMAGES\nGuest is responsible for any damages caused during the stay beyond normal wear and tear.\n\n9. REFUND POLICY\n{{REFUND_POLICY}}\n\nSIGNATURES\n\nHost Signature: _________________________ Date: _____________\n\nGuest Signature: _________________________ Date: _____________',
                0, 'daily',
                'No pets allowed unless specifically approved in advance. Additional cleaning fee may apply.',
                'No smoking. No parties without approval. Quiet hours 10pm-8am. Leave property as you found it. Report any damages immediately.',
                'Full refund if cancelled 7+ days before check-in. 50% refund if cancelled 3-7 days before. No refund within 3 days of check-in.',
                'Damage deposit refunded within 7 days of check-out if no damages are found and property is left in acceptable condition.',
                true, false, 1
            );

            -- Sublease Agreement
            INSERT INTO agreement_templates (
                business_id, created_by, template_name, description, agreement_type,
                agreement_title, template_content, default_lease_term_months,
                payment_frequency, pet_policy, house_rules, is_active, is_default, version
            ) VALUES (
                v_business.id, v_business.owner_user_id,
                'Sublease Agreement',
                'Agreement for subleasing a rental unit to a subtenant. Requires original landlord approval. Sublessor remains responsible under original lease.',
                'sublease',
                'Sublease Agreement',
                E'SUBLEASE AGREEMENT\n\nThis Sublease Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:\n\nORIGINAL TENANT (SUBLESSOR):\n{{LANDLORD_NAME}}\n{{LANDLORD_EMAIL}}\n{{LANDLORD_PHONE}}\n\nSUBTENANT (SUBLESSEE):\n{{TENANT_NAME}}\n{{TENANT_EMAIL}}\n{{TENANT_PHONE}}\n\nPROPERTY:\n{{PROPERTY_ADDRESS}}\nUnit: {{UNIT_NUMBER}}\n\n1. SUBLEASE TERM\nThis sublease shall commence on {{LEASE_START_DATE}} and shall terminate on {{LEASE_END_DATE}}.\n\n2. RENT\nMonthly Rent: {{MONTHLY_RENT}}\nPayment Due: On the {{PAYMENT_DUE_DAY}} day of each month\nPayment shall be made to the Sublessor.\n\n3. SECURITY DEPOSIT\nSecurity Deposit Amount: {{SECURITY_DEPOSIT}}\n\n4. ORIGINAL LEASE\nThis sublease is subject to all terms and conditions of the original lease agreement between the Sublessor and the Landlord/Property Owner.\n\n5. LANDLORD APPROVAL\n[ ] Landlord approval has been obtained for this sublease\n[ ] Copy of approval attached\n\n6. UTILITIES\nIncluded: {{UTILITIES_INCLUDED}}\n\n7. OCCUPANTS\nMaximum occupancy: {{MAX_OCCUPANTS}} persons.\n\n8. PETS\n{{PET_POLICY}}\n\n9. SUBLESSOR RESPONSIBILITIES\nThe Sublessor remains responsible to the original Landlord for all obligations under the original lease.\n\n10. TERMINATION\nThis sublease shall automatically terminate on {{LEASE_END_DATE}} without notice.\n\nSIGNATURES\n\nSublessor Signature: _________________________ Date: _____________\n\nSubtenant Signature: _________________________ Date: _____________',
                6, 'monthly',
                'Subject to original lease terms. No additional pets without landlord approval.',
                'Subtenant must comply with all terms of the original lease agreement.',
                true, false, 1
            );

            RAISE NOTICE 'Created 4 agreement templates for business %', v_business.id;
        END IF;

    END LOOP;

    RAISE NOTICE 'Default templates population completed!';
END $$;

-- Verify the results
SELECT
    'Application Templates' as type,
    COUNT(*) as total,
    COUNT(DISTINCT business_id) as businesses_covered
FROM application_templates
UNION ALL
SELECT
    'Agreement Templates' as type,
    COUNT(*) as total,
    COUNT(DISTINCT business_id) as businesses_covered
FROM agreement_templates;
