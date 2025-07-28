# Removal of Unused JSON Patch Endpoint

This document summarizes the removal of the unused `PATCH /api/documents/:id/json-patch` endpoint from the backend API.

## Changes Made

### 1. Backend Route File (`backend/src/routes/documents.ts`)

**Removed:**
- Import of `applyPatch, Operation` from `fast-json-patch` 
- Import of `JSONPatchRequest` from types
- `patchJSONSchema` JSON schema definition
- Complete `PATCH /api/documents/:id/json-patch` endpoint implementation

**Result:** The file now only contains the delta patch endpoint (`PATCH /api/documents/:id`) which is actually being used by the frontend.

### 2. Backend Types (`backend/src/types/index.ts`)

**Removed:**
- `JSONPatchRequest` interface definition

**Retained:**
- All other interfaces including `PatchRequest` which is used by the delta patch endpoint

### 3. Backend Dependencies (`backend/package.json`)

**Removed:**
- `fast-json-patch` dependency from the dependencies list

**Result:** Cleaner dependency list with only actively used packages.

### 4. Frontend Types (`frontend/src/lib/types.ts`)

**Removed:**
- `JSONPatchRequest` interface definition (which was a duplicate of the backend interface)

**Result:** Consistent type definitions between frontend and backend with no unused types.

### 5. Backend Tests (`backend/tests/documents.patch.test.ts`)

**Removed:**
- Complete "JSON Patch format" test suite including:
  - Test for applying JSON patch operations
  - Test for JSON patch add operation
  - Test for creating versions before JSON patch

**Retained:**
- All "Delta patch format" tests which test the actively used endpoint
- Integration tests for the document API

## Benefits

1. **Code Cleanliness**: Removed unused code that was adding complexity
2. **Reduced Dependencies**: Eliminated the `fast-json-patch` dependency
3. **Simplified API**: API surface area is now smaller and more focused
4. **Clear Intent**: No confusion about which patch format to use
5. **Easier Maintenance**: Less code to maintain and fewer tests to run

## What Remains

The following patch functionality is **still available and working**:

- `PATCH /api/documents/:id` - Delta patch endpoint for text changes
- Full support for insert, delete, and replace operations
- Proper validation and error handling
- Version history creation
- Comprehensive test coverage

## Migration Notes

- **Frontend**: No changes needed - the frontend was already using the delta patch endpoint
- **API Clients**: Any clients using the JSON patch endpoint would need to migrate to the delta format
- **Database**: No database migrations required as the JSON patch endpoint didn't use any special database features

This cleanup makes the codebase more maintainable and removes potential confusion about which patch format should be used.
