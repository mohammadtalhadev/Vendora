import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  answerQuestion,
  fetchVendorQuestions,
  setQuestionPublished,
  type VendorQuestion,
} from '../api/questions';
import { vendorKeys, useVendorScope } from './vendor-keys';

/** The store's question queue, newest first. */
export function useVendorQuestions() {
  const userId = useVendorScope();
  return useQuery({
    queryKey: vendorKeys.questions(userId),
    queryFn: ({ signal }) => fetchVendorQuestions(signal),
    enabled: Boolean(userId),
  });
}

function useQuestionQueries() {
  const userId = useVendorScope();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.questions(userId) });
    // The dashboard badge counts unanswered questions.
    queryClient.invalidateQueries({ queryKey: vendorKeys.dashboard(userId) });
  };
}

export function useAnswerQuestion() {
  const refresh = useQuestionQueries();

  return useMutation({
    mutationFn: ({
      questionId,
      answer,
      publish,
    }: {
      questionId: string;
      answer: string;
      publish?: boolean;
    }) => answerQuestion(questionId, answer, publish),
    onSuccess: (_question: VendorQuestion) => refresh(),
  });
}

export function useSetQuestionPublished() {
  const refresh = useQuestionQueries();

  return useMutation({
    mutationFn: ({ questionId, published }: { questionId: string; published: boolean }) =>
      setQuestionPublished(questionId, published),
    onSuccess: () => refresh(),
  });
}
