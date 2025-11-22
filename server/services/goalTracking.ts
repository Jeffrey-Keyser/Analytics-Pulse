import goalsDal, { Goal, GoalType } from '../dal/goals';
import { CreateEventParams } from '../dal/events';

/**
 * Goal Tracking Service
 *
 * Handles automatic goal completion detection and tracking based on incoming events.
 * This service is called asynchronously from the tracking controller to avoid
 * impacting event ingestion performance.
 */
export class GoalTrackingService {
  /**
   * Check if an event matches any active goals and record completions
   *
   * This method is designed to be called asynchronously (fire and forget)
   * from the tracking controller to avoid blocking event ingestion.
   *
   * @param eventParams - The event parameters
   */
  async checkAndRecordGoalCompletions(eventParams: CreateEventParams): Promise<void> {
    try {
      // Get all active goals for the project
      const activeGoals = await goalsDal.findByProjectId(eventParams.project_id, false);

      if (activeGoals.length === 0) {
        return;
      }

      // Check each goal to see if this event completes it
      const completionPromises = activeGoals.map(async (goal) => {
        if (this.doesEventCompleteGoal(goal, eventParams)) {
          // Record the goal completion
          await goalsDal.recordCompletion({
            goal_id: goal.id,
            project_id: eventParams.project_id,
            session_id: eventParams.session_id,
            url: eventParams.url,
            value: this.extractGoalValue(goal, eventParams),
            metadata: {
              event_type: eventParams.event_type,
              event_name: eventParams.event_name,
              utm_params: eventParams.utm_params,
              custom_data: eventParams.custom_data
            },
            timestamp: eventParams.timestamp
          });
        }
      });

      // Execute all completion checks in parallel
      await Promise.all(completionPromises);
    } catch (error) {
      // Log error but don't throw - this is a background process
      console.error('Error checking goal completions:', error);
    }
  }

  /**
   * Check if an event matches a goal's completion criteria
   *
   * @param goal - The goal to check
   * @param eventParams - The event parameters
   * @returns true if the event completes the goal
   */
  private doesEventCompleteGoal(goal: Goal, eventParams: CreateEventParams): boolean {
    switch (goal.goal_type) {
      case 'event':
        return this.checkEventTypeGoal(goal, eventParams);
      case 'pageview':
        return this.checkPageviewTypeGoal(goal, eventParams);
      case 'value':
        return this.checkValueTypeGoal(goal, eventParams);
      default:
        return false;
    }
  }

  /**
   * Check if an event matches an event-type goal
   *
   * Event-type goals are completed when a specific custom event is fired.
   */
  private checkEventTypeGoal(goal: Goal, eventParams: CreateEventParams): boolean {
    if (!goal.target_event_name) {
      return false;
    }

    // Match if it's a custom event with the target event name
    return (
      eventParams.event_type === 'custom' &&
      eventParams.event_name === goal.target_event_name
    );
  }

  /**
   * Check if an event matches a pageview-type goal
   *
   * Pageview-type goals are completed when a pageview event matches the URL pattern.
   * Supports wildcards (*) in the pattern.
   */
  private checkPageviewTypeGoal(goal: Goal, eventParams: CreateEventParams): boolean {
    if (!goal.target_url_pattern) {
      return false;
    }

    // Only pageview events can complete pageview goals
    if (eventParams.event_type !== 'pageview') {
      return false;
    }

    // Convert the URL pattern to a regex pattern
    // Escape special regex characters except *
    const regexPattern = goal.target_url_pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case-insensitive match
    return regex.test(eventParams.url);
  }

  /**
   * Check if an event matches a value-type goal
   *
   * Value-type goals are completed when a custom event includes a value
   * that meets or exceeds the target value.
   */
  private checkValueTypeGoal(goal: Goal, eventParams: CreateEventParams): boolean {
    if (goal.target_value === null || goal.target_value === undefined) {
      return false;
    }

    // Value goals can only be completed by custom events with custom_data
    if (eventParams.event_type !== 'custom' || !eventParams.custom_data) {
      return false;
    }

    // Check if custom_data contains a 'value' field that meets the target
    const eventValue = eventParams.custom_data.value;
    if (typeof eventValue !== 'number') {
      return false;
    }

    return eventValue >= goal.target_value;
  }

  /**
   * Extract the value associated with a goal completion
   *
   * For value-type goals, this extracts the actual value from the event.
   * For other goal types, returns null.
   */
  private extractGoalValue(goal: Goal, eventParams: CreateEventParams): number | undefined {
    if (goal.goal_type === 'value' && eventParams.custom_data?.value) {
      return eventParams.custom_data.value;
    }
    return undefined;
  }

  /**
   * Batch process goal completions for multiple events
   *
   * Useful for batch event imports or historical data processing.
   *
   * @param eventParamsArray - Array of event parameters
   */
  async batchCheckGoalCompletions(eventParamsArray: CreateEventParams[]): Promise<void> {
    // Process in parallel with a concurrency limit to avoid overwhelming the database
    const BATCH_SIZE = 10;

    for (let i = 0; i < eventParamsArray.length; i += BATCH_SIZE) {
      const batch = eventParamsArray.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(eventParams => this.checkAndRecordGoalCompletions(eventParams))
      );
    }
  }
}

export default new GoalTrackingService();
