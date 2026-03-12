# Feature Specification: Meal Scan History

**Feature Branch**: `002-meal-scan-history`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "View meal scan history. A user should be able to view history of meal scan. Meal scan should be grouped by the dates. And latest scan should be shown first. User should be able to delete a particular meal scan, when there is no meal scan for a particular date that group should not be visible to the user. As a part of this spec we also need to provide a short name for the scanned meal."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Meal History Grouped by Date (Priority: P1)

A user opens the History tab and sees all their past meal scans organized into date groups. The most recent date appears at the top. Within each group, meals are listed with the most recent scan shown first. Each group header displays the date label, number of meals, and aggregate nutritional totals (calories, protein, carbs, fat) for that day.

**Why this priority**: This is the core feature — without it, the history tab has no value. All other stories depend on this being in place.

**Independent Test**: Can be fully tested by seeding several meal scans across multiple dates and verifying that the history tab renders groups in correct order with correct aggregate totals.

**Acceptance Scenarios**:

1. **Given** a user has meal scans recorded on multiple different dates, **When** they navigate to the History tab, **Then** they see one date group per date, ordered from most recent to oldest.
2. **Given** a date group is displayed, **When** the user views the group header, **Then** it shows the date label (e.g., "Today", "Yesterday", or a formatted date), total meal count, and aggregate calories, protein, carbs, and fat for that day.
3. **Given** a date group is displayed, **When** the user views the meals within it, **Then** meals are ordered with the most recently scanned meal first.
4. **Given** a user has no meal scans recorded, **When** they navigate to the History tab, **Then** they see an empty state message indicating no history is available.

---

### User Story 2 - View Individual Meal Details in History (Priority: P2)

A user can see each meal scan entry within a date group, showing the meal thumbnail image, the short descriptive name assigned to the meal, the time of the scan, and individual nutritional values (calories, protein, carbs, fat).

**Why this priority**: Viewing individual meal details provides the context needed to understand each entry. The short meal name is specifically called out as a required deliverable.

**Independent Test**: Can be fully tested by scanning a meal and then viewing it in the History tab, verifying all fields are present and accurate.

**Acceptance Scenarios**:

1. **Given** a meal scan exists in history, **When** the user views it in a date group, **Then** the entry shows a thumbnail of the meal image, a short meal name, the time of the scan, and individual calorie and macro values.
2. **Given** a meal has been scanned, **When** the system stores the scan result, **Then** a short descriptive name (2–4 words, e.g., "Breakfast Bowl") is generated and associated with the meal.
3. **Given** a meal entry is displayed, **When** the user views the nutritional values, **Then** calories, protein (g), carbs (g), and fat (g) are each individually labeled and visible.

---

### User Story 3 - Delete a Meal Scan (Priority: P3)

A user can delete any individual meal scan from the history. After deletion, the entry is removed immediately. If the deleted meal was the last scan for its date, the entire date group disappears from the history view.

**Why this priority**: Deletion is important for data correction (e.g., accidental scans), but history viewing works without it.

**Independent Test**: Can be fully tested by deleting a meal scan and verifying removal from the list, and by deleting the last meal in a group to verify the group header also disappears.

**Acceptance Scenarios**:

1. **Given** a meal scan is visible in history, **When** the user activates the delete control on that entry, **Then** the meal is removed from the history list immediately.
2. **Given** a date group contains multiple meal scans, **When** the user deletes one of them, **Then** the remaining meals stay visible and the date group header updates its aggregate totals to reflect the deletion.
3. **Given** a date group contains exactly one meal scan, **When** the user deletes that meal, **Then** the date group header and the group itself are no longer visible in the history.
4. **Given** a user completes a delete action, **When** the user refreshes or revisits the History tab, **Then** the deleted meal does not reappear.

---

### Edge Cases

- What happens when a user has scans from many months ago — are all dates shown, or is there a cap on how far back history is displayed?
- How does the system handle a meal scan where short-name generation fails — is a fallback name used?
- What if two scans occur at the same time — how is their order within a date group determined?
- What if a delete action fails (e.g., network error) — does the entry reappear or does the user see an error?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all meal scans grouped by the calendar date on which they were scanned.
- **FR-002**: Date groups MUST be ordered from most recent to oldest (newest date at the top of the list).
- **FR-003**: Within each date group, meal scans MUST be ordered from most recently scanned to least recently scanned.
- **FR-004**: Each date group header MUST display: the date label, total number of meal scans for that day, and the aggregate calorie, protein, carbohydrate, and fat totals for that day.
- **FR-005**: The date label MUST use "Today" for the current calendar date and "Yesterday" for the previous calendar date; all other dates MUST display as a human-readable formatted date (e.g., "March 10").
- **FR-006**: Each meal scan entry MUST display: a thumbnail of the meal image, the short meal name, the time the scan was recorded, and individual nutritional values (calories, protein, carbs, fat).
- **FR-007**: When a meal is scanned and saved, the system MUST generate and store a short descriptive name (2–4 words) that identifies the meal (e.g., "Breakfast Bowl", "Grilled Chicken Salad").
- **FR-008**: Users MUST be able to delete any individual meal scan entry from the history view.
- **FR-009**: Upon deleting a meal scan, the entry MUST be removed from the history view immediately without requiring a page reload.
- **FR-010**: When all meal scans for a given date are deleted, the corresponding date group MUST be removed from the history view entirely.
- **FR-011**: Aggregate nutritional totals in a date group header MUST update immediately when a meal scan within that group is deleted.

### Key Entities

- **MealScan**: Represents a single recorded meal scan. Key attributes: unique identifier, short meal name, meal thumbnail image, time of scan, calorie count, protein (g), carbohydrate (g), fat (g).
- **DateGroup**: A logical grouping of MealScans sharing the same calendar date. Derived attributes: date label, meal count, aggregate nutritional totals (calculated from its MealScans).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to the History tab and see their complete meal scan history grouped by date within 2 seconds.
- **SC-002**: Date groups and meal entries within them are always displayed in the correct chronological order (newest first) with 100% accuracy.
- **SC-003**: After deleting a meal scan, the entry disappears from the view within 1 second, and date group aggregate totals update to reflect the deletion.
- **SC-004**: When the last meal in a date group is deleted, the date group is removed from the view within 1 second.
- **SC-005**: Every meal scan stored in history has a short descriptive name of 2–4 words; no stored scan has a missing or blank name.
- **SC-006**: Users can complete a delete action with a single interaction (one tap or click on the delete control).

## Assumptions

- The short meal name is generated at scan time (when the image is analyzed) and stored alongside nutritional data — it is not generated on-demand when viewing history.
- Previously scanned meals stored without a short name will display a placeholder (e.g., "Unnamed Meal") until the feature is backfilled or the scan is re-submitted.
- History shows all scans with no date-range limit initially; pagination or a history cap can be introduced later if performance requires it.
- Deletion is immediate and permanent — there is no undo or trash/recycle mechanism.
- Date grouping is based on the user's local calendar date at the time of the scan, not UTC.
- The History view is only accessible to authenticated users viewing their own meal scan data.
