# Feature Specification: Meal Calorie Tracking

**Feature Branch**: `001-meal-calorie-tracking`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Integrate meal upload with actual calculating calories and recording that data for the user. Now when user scan and upload the meal they will be show the calories and other nutriation values in their meal and that will be recorded. Showing history on UI will be out of scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Nutrition After Meal Upload (Priority: P1)

A logged-in user uploads or scans a photo of their meal. The system analyses the image, identifies the food items, and displays the estimated calories and key nutrition values (protein, carbohydrates, fat, and fibre) on the same page. The user sees this information immediately without navigating away.

**Why this priority**: This is the core value proposition of the feature. Without it nothing else is useful.

**Independent Test**: Can be fully tested by uploading a meal image and verifying that calorie and nutrition data is displayed on screen — delivers the primary user value independently.

**Acceptance Scenarios**:

1. **Given** a logged-in user is on the meal upload page, **When** they upload a clear photo of a meal, **Then** the page displays the estimated total calories plus at least protein, carbohydrates, and fat values for that meal.
2. **Given** a logged-in user submits a meal image, **When** the analysis is complete, **Then** the nutrition results are shown within 15 seconds on the same page.
3. **Given** a logged-in user submits an image that contains no recognisable food, **When** analysis completes, **Then** the system shows a clear message explaining the image could not be analysed and prompts the user to try again.

---

### User Story 2 - Meal Record Saved Automatically (Priority: P2)

After the nutrition values are displayed to the user, the system automatically saves a record of the meal (image reference, detected food items, calories, and nutrition values) against the logged-in user's account without requiring any extra action from the user.

**Why this priority**: Recording the data is the second half of the feature goal. Display without persistence has limited long-term value, but the display (P1) must work first.

**Independent Test**: Can be tested by uploading a meal, then querying the back-end data store directly to confirm a record was created with the correct nutrition data for that user.

**Acceptance Scenarios**:

1. **Given** a meal image has been successfully analysed and nutrition values displayed, **When** the results are shown to the user, **Then** a meal record containing the timestamp, detected food items, calories, and nutrition values is saved for the logged-in user.
2. **Given** a meal is saved, **When** the record is retrieved from the data store, **Then** it includes: user identifier, date/time of upload, food item(s) detected, total calories, protein, carbohydrates, fat, and fibre values.
3. **Given** analysis fails or returns no recognisable food, **When** the error is shown, **Then** no meal record is created.

---

### Edge Cases

- What happens when the uploaded image is not a food photo (e.g. a landscape)?
- What happens when the image file is corrupt or in an unsupported format?
- What happens if the external analysis service is unavailable?
- What happens when the detected meal contains items that cannot be individually identified (e.g. mixed stew)?
- What happens if a user uploads the same meal photo twice?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a meal image uploaded by an authenticated user and submit it for nutrition analysis.
- **FR-002**: System MUST display the estimated total calories of the analysed meal to the user.
- **FR-003**: System MUST display at least the following nutrition values: protein (g), carbohydrates (g), fat (g), and fibre (g).
- **FR-004**: System MUST display the list of detected food items alongside the nutrition values.
- **FR-005**: System MUST automatically save a meal record for the authenticated user upon successful analysis without requiring additional user action.
- **FR-006**: System MUST record the following per saved meal: user identifier, upload date and time, detected food items, total calories, protein, carbohydrates, fat, and fibre.
- **FR-007**: System MUST show a user-friendly error message when the image cannot be analysed (unrecognised food, unsupported format, or service failure).
- **FR-008**: System MUST NOT save a meal record when analysis fails or no food is recognised.
- **FR-009**: System MUST display analysis results on the same page used for upload (no full-page redirect required).
- **FR-010**: Meal history display on the UI is explicitly out of scope for this feature.

### Key Entities

- **Meal Record**: Represents one logged meal for a user. Attributes: user identifier, upload timestamp, detected food items (list of names), total calories (kcal), protein (g), carbohydrates (g), fat (g), fibre (g).
- **Nutrition Analysis Result**: The output of analysing a meal image. Contains detected food items and their combined nutrition values. Transient — used to populate a Meal Record and the UI display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see calorie and nutrition values displayed on screen within 15 seconds of submitting a meal image under normal conditions.
- **SC-002**: 100% of successfully analysed meals result in a saved meal record in the data store.
- **SC-003**: Meal records contain all six required fields (timestamp, food items, calories, protein, carbohydrates, fat) for every saved entry.
- **SC-004**: Users receive a clear, actionable error message in 100% of failed analysis attempts — no silent failures or blank screens.
- **SC-005**: The upload-to-results flow requires zero additional user actions beyond selecting and submitting the image (nutrition display and record saving are automatic).

## Assumptions

- The user is already authenticated before reaching the meal upload page (login is handled by an existing feature).
- An external service or AI model capable of identifying food items and returning nutrition estimates from an image will be integrated; the specific service is a planning-phase decision.
- Nutrition values are estimates and may not match exact quantities; the system does not need to support portion size adjustments in this iteration.
- Fibre is included as a nutrition field; if the analysis service does not return fibre, it may be omitted from the record and displayed as "not available".
- The image formats supported are standard web formats (JPEG, PNG, WebP); other formats may be rejected with an appropriate message.
- Data retention follows standard application practices; no specific retention period is mandated for this feature.
