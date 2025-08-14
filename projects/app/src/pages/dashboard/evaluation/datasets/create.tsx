import MyBox from '@fastgpt/web/components/common/MyBox';
import DashboardContainer from '@/pageComponents/dashboard/Container';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Button,
  Flex,
  Input,
  VStack,
  Textarea,
  Select,
  HStack,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useDisclosure
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { useForm, useFieldArray } from 'react-hook-form';
import FormLabel from '@fastgpt/web/components/common/MyBox/FormLabel';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import type {
  CreateEvaluationDatasetBody,
  EvaluationData
} from '@fastgpt/global/core/evaluation/type';
import { generateId } from '@fastgpt/global/core/evaluation/utils';

import { postCreateEvaluationDataset } from '@/web/core/evaluation/evaluation';

type EvaluationDatasetFormType = {
  name: string;
  description: string;
  version: string;
  source_type: 'manual' | 'jsonl' | 'excel' | 'huggingface' | 'generated';
  tags: string;
  data: EvaluationData[];
};

const CreateEvaluationDataset = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<EvaluationDatasetFormType>({
    defaultValues: {
      name: '',
      description: '',
      version: '1.0.0',
      source_type: 'manual',
      tags: '',
      data: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'data'
  });

  const { runAsync: onSubmit, loading } = useRequest2(postCreateEvaluationDataset, {
    onSuccess: () => {
      toast({
        title: t('common:Create Success'),
        status: 'success'
      });
      router.push('/dashboard/evaluation/datasets');
    },
    onError: (error) => {
      toast({
        title: t('common:Create Failed'),
        description: error.message,
        status: 'error'
      });
    }
  });

  const handleFormSubmit = async (data: EvaluationDatasetFormType) => {
    const tags = data.tags ? data.tags.split(',').map((tag) => tag.trim()) : [];

    await onSubmit({
      name: data.name,
      description: data.description,
      version: data.version,
      data: data.data,
      tags,
      source_type: data.source_type
    });
  };

  const addDataRow = () => {
    append({
      id: generateId(),
      user_input: '',
      expected_output: '',
      context: '',
      retrieval_context: '',
      metadata: {},
      scenario: '',
      persona: ''
    });
  };

  return (
    <DashboardContainer>
      {({ MenuIcon }) => (
        <MyBox>
          <Flex justifyContent="space-between" alignItems="center" mb={6}>
            <Box fontSize="2xl" fontWeight="bold">
              {t('dashboard_evaluation:Create Evaluation Dataset')}
            </Box>
            <Button
              leftIcon={<MyIcon name="common/backFill" w="14px" />}
              variant="ghost"
              onClick={() => router.back()}
            >
              {t('common:Back')}
            </Button>
          </Flex>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <VStack spacing={6} align="stretch">
              <Box>
                <FormLabel>{t('common:Name')} *</FormLabel>
                <Input
                  {...register('name', { required: t('common:Name Required') })}
                  placeholder={t('common:Enter Name')}
                />
                {errors.name && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.name.message}
                  </Box>
                )}
              </Box>

              <Box>
                <FormLabel>{t('common:Description')}</FormLabel>
                <Textarea
                  {...register('description')}
                  placeholder={t('common:Enter Description')}
                  rows={3}
                />
              </Box>

              <Box>
                <FormLabel>{t('common:Version')} *</FormLabel>
                <Input
                  {...register('version', { required: t('common:Version Required') })}
                  placeholder="1.0.0"
                />
                {errors.version && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.version.message}
                  </Box>
                )}
              </Box>

              <Box>
                <FormLabel>{t('common:Source_Type')} *</FormLabel>
                <Select
                  {...register('source_type', { required: t('common:Source_Type Required') })}
                >
                  <option value="manual">{t('dashboard_evaluation:Manual')}</option>
                  <option value="jsonl">{t('dashboard_evaluation:JSONL')}</option>
                  <option value="excel">{t('dashboard_evaluation:Excel')}</option>
                  <option value="huggingface">{t('dashboard_evaluation:HuggingFace')}</option>
                  <option value="generated">{t('dashboard_evaluation:Generated')}</option>
                </Select>
                {errors.source_type && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.source_type.message}
                  </Box>
                )}
              </Box>

              <Box>
                <FormLabel>{t('common:Tags')}</FormLabel>
                <Input
                  {...register('tags')}
                  placeholder={t('common:Enter Tags Separated by Commas')}
                />
              </Box>

              {/* 评估数据部分 */}
              <Box>
                <Flex justifyContent="space-between" alignItems="center" mb={4}>
                  <FormLabel>{t('dashboard_evaluation:Evaluation Data')}</FormLabel>
                  <Button
                    size="sm"
                    leftIcon={<MyIcon name="common/addLight" w="14px" />}
                    onClick={addDataRow}
                  >
                    {t('dashboard_evaluation:Add Data Row')}
                  </Button>
                </Flex>

                {fields.length > 0 && (
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>{t('dashboard_evaluation:User Input')} *</Th>
                          <Th>{t('dashboard_evaluation:Expected Output')} *</Th>
                          <Th>{t('dashboard_evaluation:Context')}</Th>
                          <Th>{t('dashboard_evaluation:Scenario')}</Th>
                          <Th>{t('common:Actions')}</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {fields.map((field, index) => (
                          <Tr key={field.id}>
                            <Td>
                              <Textarea
                                {...register(`data.${index}.user_input`, {
                                  required: t('dashboard_evaluation:User Input Required')
                                })}
                                placeholder={t('dashboard_evaluation:Enter User Input')}
                                size="sm"
                                rows={2}
                              />
                            </Td>
                            <Td>
                              <Textarea
                                {...register(`data.${index}.expected_output`, {
                                  required: t('dashboard_evaluation:Expected Output Required')
                                })}
                                placeholder={t('dashboard_evaluation:Enter Expected Output')}
                                size="sm"
                                rows={2}
                              />
                            </Td>
                            <Td>
                              <Textarea
                                {...register(`data.${index}.context`)}
                                placeholder={t('dashboard_evaluation:Enter Context')}
                                size="sm"
                                rows={2}
                              />
                            </Td>
                            <Td>
                              <Input
                                {...register(`data.${index}.scenario`)}
                                placeholder={t('dashboard_evaluation:Enter Scenario')}
                                size="sm"
                              />
                            </Td>
                            <Td>
                              <IconButton
                                aria-label="Delete"
                                icon={<MyIcon name="common/trash" w="14px" />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => remove(index)}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              <Flex gap={4} justifyContent="flex-end">
                <Button variant="ghost" onClick={() => router.back()} disabled={loading}>
                  {t('common:Cancel')}
                </Button>
                <Button
                  type="submit"
                  leftIcon={<MyIcon name="common/addLight" w="14px" />}
                  isLoading={loading}
                >
                  {t('common:Create')}
                </Button>
              </Flex>
            </VStack>
          </form>
        </MyBox>
      )}
    </DashboardContainer>
  );
};

export default CreateEvaluationDataset;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
