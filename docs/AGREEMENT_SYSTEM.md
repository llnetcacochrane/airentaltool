# Landlord-Tenant Agreement System

A comprehensive digital lease agreement system with AI-assisted creation, electronic signatures, and PDF generation.

## Overview

The agreement system allows landlords to:
- Create reusable lease agreement templates with AI assistance
- Issue agreements to tenants
- Collect digital signatures electronically
- Download signed agreements as PDFs
- Track agreement status and audit trail

## Features

### 1. AI-Assisted Template Creation
- **Smart Form**: Guided form with all necessary lease terms
- **AI Generation**: Uses OpenAI to generate professional, legally-sound agreement text
- **Customization**: Full control over terms, policies, and conditions
- **Multiple Templates**: Save and reuse templates for different properties/situations

### 2. Agreement Templates
- **Reusable**: Create once, use multiple times
- **Flexible**: Support for various agreement types:
  - Standard Lease (long-term)
  - Month-to-Month
  - Short-Term Rental
  - Sublease Agreement
- **Versioning**: Track template versions
- **Default Templates**: Mark frequently-used templates as default

### 3. Digital Signatures
- **Two Methods**:
  - Draw signature with mouse/touchscreen
  - Type full name (styled in cursive font)
- **Legal Consent**: Clear consent checkbox with legal binding language
- **Audit Trail**: Records IP address, timestamp, device info
- **Multi-Party**: Support for landlord and tenant signatures
- **Status Tracking**: Track signature completion

### 4. Agreement Workflow
1. **Draft**: Create agreement from template
2. **Sent**: Send to tenant for review
3. **Viewed**: Tenant opens agreement
4. **Signed**: Tenant signs agreement
5. **Executed**: Both parties have signed (fully executed)
6. **Terminated/Expired**: Agreement ended

### 5. PDF Generation
- **Professional Format**: Clean, well-structured PDF output
- **Complete Information**: Includes all agreement details and terms
- **Signature Section**: Shows signature status and dates
- **Download Anytime**: Generate PDF at any stage

### 6. Tenant Experience
- **Public Link**: Shareable agreement URL
- **Mobile-Friendly**: Works on all devices
- **Clear UI**: Easy to read and understand
- **Action Required**: Clear call-to-action for signing
- **Status Visibility**: See signature status

## Database Schema

### Tables

#### `agreement_templates`
Reusable templates created by landlords.

**Key Fields:**
- `template_name`: Name of the template
- `agreement_type`: Type (lease, month-to-month, etc.)
- `content`: Structured form data (JSON)
- `generated_text`: AI-generated agreement text
- `default_*`: Default values for rent, deposit, term
- `pet_policy`, `house_rules`, etc.: Policy fields
- `ai_prompt_used`, `ai_model_used`: AI generation metadata

#### `lease_agreements`
Issued agreements linked to specific tenants.

**Key Fields:**
- `template_id`: Reference to source template
- `tenant_id`, `unit_id`, `property_id`: Entity relationships
- `landlord_name`, `landlord_email`: Landlord info
- `tenant_name`, `tenant_email`: Tenant info
- `content`: Complete agreement data
- `generated_text`: Final agreement text
- `start_date`, `end_date`: Lease dates
- `rent_amount`, `security_deposit`: Financial terms
- `status`: Current workflow status
- `landlord_signed`, `tenant_signed`: Signature status
- `pdf_url`, `signed_pdf_url`: Document URLs

#### `agreement_signatures`
Digital signature records.

**Key Fields:**
- `agreement_id`: Reference to agreement
- `signer_type`: landlord, tenant, guarantor, witness
- `signer_name`, `signer_email`: Signer identity
- `signature_data`: Base64 image or typed name
- `signature_method`: digital, typed, esign_service
- `consent_text`, `consent_agreed`: Legal consent
- `signer_ip`, `user_agent`: Audit information

#### `agreement_audit_log`
Complete audit trail of all actions.

**Key Fields:**
- `agreement_id`: Reference to agreement
- `action_type`: created, updated, sent, viewed, signed, etc.
- `action_by`: User who performed action
- `old_status`, `new_status`: Status changes
- `changes`: JSON of what changed
- `ip_address`, `user_agent`: Context

### Functions

#### `generate_agreement_from_template(template_id, tenant_id, lease_id, custom_data)`
Creates a new agreement from a template, auto-populating tenant and property data.

#### `send_agreement_to_tenant(agreement_id)`
Updates agreement status to 'sent' and sets signature deadline.

#### `sign_agreement(agreement_id, signer_type, signature_data, signature_method)`
Records a signature and updates agreement status.

#### `mark_agreement_viewed(agreement_id)`
Tracks when tenant first views the agreement.

### Row Level Security

**Templates:**
- Users can CRUD their own templates
- No cross-user access

**Agreements:**
- Landlords can view/edit agreements they created
- Tenants can view agreements assigned to them (by email)
- Tenants can sign their agreements

**Signatures:**
- Users can view signatures on agreements they're involved with
- Users can create their own signatures

**Audit Log:**
- Read-only for all relevant parties

## Usage Guide

### For Landlords

#### Create a Template

1. Navigate to `/agreements`
2. Click "Create Template"
3. Fill in template information:
   - Template name (e.g., "Standard 12-Month Lease")
   - Agreement type
   - Description (optional)
4. Enter basic terms:
   - Property owner name
   - Rental amount
   - Payment frequency
   - Lease term
   - Security deposit
5. Set policies:
   - Pet policy
   - House rules
   - Cancellation policy
   - Max occupants
6. Add property details:
   - Property description
   - Parking information
   - Additional terms
7. Click "Generate with AI"
8. Review generated agreement
9. Click "Save Template"

#### Issue Agreement to Tenant

Option 1: From Template
```typescript
const agreementId = await agreementService.generateAgreementFromTemplate(
  templateId,
  tenantId,
  leaseId,
  {
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    rent_amount: 1500,
    // ... custom overrides
  }
);
```

Option 2: Create Directly
```typescript
const agreement = await agreementService.createAgreement({
  tenant_id: tenantId,
  unit_id: unitId,
  property_id: propertyId,
  landlord_name: 'John Smith',
  landlord_email: 'john@example.com',
  tenant_name: 'Jane Doe',
  tenant_email: 'jane@example.com',
  agreement_title: 'Residential Lease Agreement',
  agreement_type: 'lease',
  content: formData,
  generated_text: aiGeneratedText,
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  rent_amount: 1500,
  security_deposit: 1500,
  payment_frequency: 'monthly',
  property_address: '123 Main St, City, State 12345',
});
```

#### Send for Signature
```typescript
await agreementService.sendAgreement(agreementId);
// This updates status to 'sent' and sets a 7-day deadline
```

#### Download PDF
```typescript
const agreement = await agreementService.getAgreement(agreementId);
await pdfGenerationService.generateAgreementPDF(agreement);
```

### For Tenants

#### View and Sign Agreement

1. Receive email with agreement link: `/agreement/{agreementId}`
2. Review agreement details
3. Click "Sign Agreement"
4. Choose signature method:
   - Draw signature
   - Type name
5. Check consent checkbox
6. Click "Sign Agreement"
7. Agreement marked as signed
8. Download PDF copy

#### Check Signature Status

The agreement page shows:
- Current status (sent, viewed, signed, executed)
- Who has signed
- Signature dates
- Deadline (if applicable)

## API Examples

### Get Templates
```typescript
const templates = await agreementService.getTemplates({
  is_active: true,
  business_id: 'business-uuid'
});
```

### Get Pending Signatures
```typescript
const pending = await agreementService.getPendingSignatures();
```

### Get Executed Agreements
```typescript
const executed = await agreementService.getExecutedAgreements({
  business_id: 'business-uuid'
});
```

### Get Tenant's Agreements
```typescript
const myAgreements = await agreementService.getAgreementsForTenant(
  'tenant@example.com'
);
```

### Get Signatures
```typescript
const signatures = await agreementService.getSignatures(agreementId);
```

### Get Audit Log
```typescript
const auditLog = await agreementService.getAuditLog(agreementId);
```

## AI Integration

### Generating Agreement Text

The system uses OpenAI to generate professional agreement text. The prompt includes:
- Property owner information
- Rental amount and payment terms
- Lease duration
- Security deposit
- Policies (pet, cancellation, damage, refund)
- House rules
- Property description
- Additional terms

The AI generates a comprehensive agreement with:
1. Parties section
2. Property description
3. Lease term and rent details
4. Security deposit terms
5. Maintenance responsibilities
6. Rules and policies
7. Termination clauses
8. Signature section

### Customization

Edit the prompt in `src/components/AgreementBuilder.tsx` to:
- Change tone/style
- Add/remove sections
- Adjust legal language
- Include state-specific requirements

## PDF Features

Generated PDFs include:
- Agreement title and type
- Party information (landlord and tenant)
- Property details
- Lease terms table
- Complete agreement text (multi-page if needed)
- Signature section (if signed)
- Professional formatting

## Security Considerations

### Legal Binding
Electronic signatures are legally binding under:
- ESIGN Act (federal)
- UETA (state laws)
- Most jurisdictions worldwide

### Best Practices
1. **Clear Consent**: Explicit checkbox with legal language
2. **Audit Trail**: Record IP, timestamp, device info
3. **Identity Verification**: Link signatures to authenticated users
4. **Document Integrity**: Store original and signed versions
5. **Access Control**: RLS policies prevent unauthorized access
6. **Secure Storage**: Use Supabase secure storage for PDFs

### Compliance
- Store signature data securely
- Maintain audit logs
- Provide copies to all parties
- Keep records for required retention period

## Testing

### Test Workflow

1. **Create Template**
   - Fill form with test data
   - Generate with AI (requires API key)
   - Save template

2. **Create Agreement**
   - Generate from template
   - Verify data populated correctly

3. **Send Agreement**
   - Call send function
   - Check status updated
   - Verify deadline set

4. **Sign as Tenant**
   - Open agreement link
   - Verify viewed status
   - Sign agreement
   - Confirm signed status

5. **Download PDF**
   - Generate PDF
   - Verify content
   - Check signature section

6. **Check Audit Log**
   - View all actions
   - Verify timestamps
   - Check actor information

## Troubleshooting

### Issue: AI Generation Fails
**Cause**: Missing or invalid API key
**Solution**: Configure OpenAI API key in System Configuration

### Issue: Signature Not Saving
**Cause**: RLS policy blocking insert
**Solution**: Verify user is authenticated and email matches

### Issue: PDF Not Generating
**Cause**: Missing agreement data
**Solution**: Ensure agreement has all required fields

### Issue: Tenant Can't Access Agreement
**Cause**: Email mismatch
**Solution**: Verify tenant_email matches authenticated user's email

## Future Enhancements

### Planned Features
- [ ] E-signature service integration (DocuSign, HelloSign)
- [ ] SMS notifications for signature requests
- [ ] Reminder system for pending signatures
- [ ] Renewal agreements (auto-generate from existing)
- [ ] Amendment/addendum support
- [ ] Multi-language agreements
- [ ] State-specific templates
- [ ] Witness signatures
- [ ] Guarantor support
- [ ] Bulk issuance
- [ ] Agreement analytics

### Integration Opportunities
- **Email**: Send agreements via email
- **Calendar**: Add lease dates to calendar
- **Payments**: Link to payment system
- **Maintenance**: Reference in maintenance requests
- **Renewals**: Auto-generate renewal offers

## Technical Notes

### Performance
- Templates cached client-side
- PDF generation happens client-side (jsPDF)
- Signature images stored as base64
- Audit logs indexed for fast queries

### Scalability
- Agreement tables indexed properly
- RLS policies optimized
- PDF generation offloadable to server if needed
- Signature data can be stored in Supabase Storage

### Browser Compatibility
- Canvas signature works in all modern browsers
- Touch signature works on mobile
- PDF generation works client-side
- Responsive design for all screen sizes
